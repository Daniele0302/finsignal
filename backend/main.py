from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from collections import Counter
import re
import os
import json

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

app = FastAPI(title="FinSignal API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_PATH = "data/fintech_clean_v2.tsv"
df = pd.read_csv(DATA_PATH, sep="\t")

VALID_BANKS = [
    "JPMORGAN CHASE & CO.",
    "WELLS FARGO & COMPANY",
    "BANK OF AMERICA, NATIONAL ASSOCIATION",
    "CITIBANK, N.A.",
    "CAPITAL ONE FINANCIAL CORPORATION",
    "AMERICAN EXPRESS COMPANY",
    "U.S. BANCORP",
    "DISCOVER BANK",
    "TD BANK US HOLDING COMPANY",
    "PNC Bank N.A.",
]

df["company"] = df["company"].astype(str).str.strip()
df = df[df["company"].isin(VALID_BANKS)]

df["date"] = pd.to_datetime(df["date"], errors="coerce")
df = df.dropna(subset=["date", "company", "text", "product"])
df["year"] = df["date"].dt.year
df["text"] = df["text"].astype(str)
df["product"] = df["product"].astype(str)

STOPWORDS = set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "my", "i", "it", "is", "was", "have", "has", "been",
    "they", "them", "their", "this", "that", "we", "our", "your", "xxxx",
    "would", "could", "said", "told", "also", "when", "were", "had",
    "not", "from", "be", "as", "by", "are", "me", "so", "if", "up", "did",
    "do", "its", "into", "about", "after", "just", "more", "will", "which",
    "bank", "account", "company", "customer", "service", "complaint", "credit",
    "checking", "savings", "card", "cards", "problem", "problems", "other",
    "issue", "issues", "purchase", "statement", "statements", "received",
    "called", "phone", "email", "letter", "information", "consumer"
])


def get_bank_df(bank_name: str):
    return df[df["company"] == bank_name]


def extract_keywords(bank_df, limit=12):
    all_text = " ".join(bank_df["text"].dropna().tolist()).lower()
    words = re.findall(r"\b[a-z]{4,}\b", all_text)
    words = [word for word in words if word not in STOPWORDS]
    return Counter(words).most_common(limit)


@app.get("/")
def home():
    return {
        "message": "FinSignal API is running - AI STRATEGY VERSION",
        "rows_loaded": len(df),
        "available_endpoints": [
            "/banks",
            "/benchmark",
            "/bank/{bank_name}",
            "/top-issues/{bank_name}",
            "/wordcloud/{bank_name}",
            "/strategy/{bank_name}",
        ],
    }


@app.get("/banks")
def get_banks():
    banks = sorted(df["company"].dropna().unique().tolist())
    return {"banks": banks}


@app.get("/benchmark")
def get_benchmark():
    result = []
    total_all_banks = len(df)

    for bank in sorted(df["company"].dropna().unique()):
        bank_df = get_bank_df(bank)
        total = len(bank_df)
        complaint_share_pct = round(total / total_all_banks * 100, 1)
        top_product = bank_df["product"].value_counts().index[0]

        result.append({
            "bank": bank,
            "total": int(total),
            "complaint_share_pct": complaint_share_pct,
            "top_product": top_product,
        })

    result = sorted(result, key=lambda x: x["total"], reverse=True)
    return {"benchmark": result}


@app.get("/bank/{bank_name}")
def get_bank_overview(bank_name: str):
    bank_df = get_bank_df(bank_name)

    if bank_df.empty:
        return {"error": "Bank not found"}

    total = len(bank_df)
    total_all_banks = len(df)
    complaint_share_pct = round(total / total_all_banks * 100, 1)
    top_product = bank_df["product"].value_counts().index[0]

    return {
        "bank": bank_name,
        "total_complaints": int(total),
        "complaint_share_pct": complaint_share_pct,
        "top_product": top_product,
    }


@app.get("/top-issues/{bank_name}")
def get_top_issues(bank_name: str):
    bank_df = get_bank_df(bank_name)

    if bank_df.empty:
        return {"error": "Bank not found"}

    top_issues = bank_df["product"].value_counts().head(10).reset_index()
    top_issues.columns = ["product", "count"]

    return {
        "bank": bank_name,
        "top_issues": top_issues.to_dict(orient="records"),
    }


@app.get("/wordcloud/{bank_name}")
def get_wordcloud(bank_name: str):
    bank_df = get_bank_df(bank_name)

    if bank_df.empty:
        return {"error": "Bank not found"}

    word_freq = extract_keywords(bank_df, limit=50)

    return {
        "bank": bank_name,
        "words": [{"word": word, "count": int(count)} for word, count in word_freq],
    }


@app.get("/strategy/{bank_name}")
def get_strategy(bank_name: str):
    bank_df = get_bank_df(bank_name)

    if bank_df.empty:
        return {"error": "Bank not found"}

    total = len(bank_df)
    top_product = bank_df["product"].value_counts().index[0]
    top_issues = bank_df["product"].value_counts().head(5).to_dict()
    top_keywords = [word for word, count in extract_keywords(bank_df, limit=12)]

    fallback_strategy = {
        "core_issue": f"{bank_name} shows its strongest complaint concentration in {top_product}.",
        "opportunity": "A challenger fintech can compete by reducing customer effort, simplifying resolution flows, and improving communication clarity.",
        "strategic_move": f"Position around customer pain points such as {', '.join(top_keywords[:5])}, turning incumbent weaknesses into a trust-based acquisition strategy.",
        "source": "data_driven_fallback"
    }

    if OpenAI is None or not os.getenv("OPENAI_API_KEY"):
        return fallback_strategy

    prompt = f"""
You are a fintech strategy consultant.
Use the complaint analytics below to generate a concise executive strategy for a challenger fintech.

Bank analyzed: {bank_name}
Total complaints analyzed: {total}
Main complaint area: {top_product}
Top complaint areas: {top_issues}
Top recurring keywords: {top_keywords}

Return only valid JSON with exactly these keys:
core_issue, opportunity, strategic_move.
Each value must be one concise sentence.
"""

    client = OpenAI()
    response = client.responses.create(
        model=os.getenv("OPENAI_MODEL", "gpt-5.5"),
        input=prompt,
    )

    try:
        parsed = json.loads(response.output_text)
        return {
            "core_issue": parsed.get("core_issue", fallback_strategy["core_issue"]),
            "opportunity": parsed.get("opportunity", fallback_strategy["opportunity"]),
            "strategic_move": parsed.get("strategic_move", fallback_strategy["strategic_move"]),
            "source": "openai_api"
        }
    except Exception:
        return {
            "core_issue": fallback_strategy["core_issue"],
            "opportunity": fallback_strategy["opportunity"],
            "strategic_move": response.output_text,
            "source": "openai_api_raw_fallback"
        }