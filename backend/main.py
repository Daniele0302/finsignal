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
    "called", "phone", "email", "letter", "information", "consumer",
    "prepaid", "sent", "asked", "took", "made", "make", "time", "money"
])


def get_bank_df(bank_name: str):
    return df[df["company"] == bank_name]


def extract_keywords(bank_df, limit=12):
    all_text = " ".join(bank_df["text"].dropna().tolist()).lower()
    words = re.findall(r"\b[a-z]{4,}\b", all_text)
    words = [word for word in words if word not in STOPWORDS]
    return Counter(words).most_common(limit)


def build_fallback_strategy(bank_name: str, bank_df):
    top_product = bank_df["product"].value_counts().index[0]
    top_keywords = [word for word, count in extract_keywords(bank_df, limit=12)]
    keyword_text = ", ".join(top_keywords[:5]) if top_keywords else "trust, transparency, support"

    return {
        "core_issue": f"{bank_name} shows its strongest complaint concentration in {top_product}.",
        "opportunity": "A challenger fintech can compete by reducing customer effort, simplifying resolution flows, and improving communication clarity.",
        "strategic_move": f"Position around customer pain points such as {keyword_text}, turning incumbent weaknesses into a trust-based acquisition strategy.",
        "source": "ai_ready_data_driven_mode"
    }


@app.get("/")
def home():
    return {
        "message": "FinSignal API is running - SAFE AI STRATEGY VERSION",
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

    return build_fallback_strategy(bank_name, bank_df)
    