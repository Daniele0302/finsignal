# FinSignal

FinSignal is a financial complaint intelligence dashboard for banks and fintechs.

It transforms consumer complaint data into competitor benchmarks, product-level pain point analysis, keyword intelligence, and strategic recommendations.

## Live Demo

Frontend: https://finsignal-alpha.vercel.app/  
Backend API: https://finsignal.onrender.com

## What FinSignal Does

- Benchmarks major financial institutions by complaint volume
- Shows complaint share across competitors
- Identifies each bank's main complaint area
- Provides institution-level deep dives
- Extracts recurring complaint keywords
- Generates data-driven strategic recommendations for fintech positioning

## Tech Stack

- Frontend: React, Recharts, Vercel
- Backend: FastAPI, Pandas, Render
- Data: CFPB consumer complaint dataset
- Deployment: GitHub + Render + Vercel

## API Endpoints

- `/`
- `/banks`
- `/benchmark`
- `/bank/{bank_name}`
- `/top-issues/{bank_name}`
- `/wordcloud/{bank_name}`

## Project Purpose

FinSignal is designed as an MVP for competitor intelligence in financial services.  
It helps fintechs understand where incumbent banks create customer friction and where new products can compete.
