# ClearBill — Agentic AI Invoice Auditor

> AI-powered invoice processing and compliance auditing. Upload an invoice, get instant extraction, validation, fraud detection, and a compliance score — with explainable AI reasoning.

![ClearBill Demo](./assets/flow.png)

---

## What is ClearBill?

ClearBill is an agentic AI system that processes invoices the way a smart accountant would — not just running fixed checks, but *reasoning* about each invoice and deciding which validations to run based on what it finds.

Think SAP Concur, but AI-native.

---

## How it works

### Pipeline v1 (old)
```
Upload → Extract → Validate → Store
```
Fixed order, no intelligence.

### Agentic v2 (this project)
```
Upload → Extract → Agent reasons → Decides tools → Score → Store
```
The AI decides which tools to call based on intermediate results.

---

## Architecture

### Model Routing
| File Type | Model | Why |
|---|---|---|
| PDF | `llama-3.3-70b-versatile` | Text model — reads PyMuPDF extracted text |
| Image / Scan | `llama-4-scout-17b` | Vision model — reads pixels directly |

### Agent Tools
| Tool | Triggers | Purpose |
|---|---|---|
| `extract` | Always | OCR + structured field parsing |
| `validate` | Always | Policy rules, amount limits, date checks |
| `check_vendor` | Always | Past rejection rate from DB |
| `detect_anomaly` | Amount > $1000 OR risky vendor | LLM fraud signal detection |

### Compliance Scoring
```
Start: 100 points
High severity violation:   -30
Medium severity violation: -15
Low severity violation:    -5

Approved: score ≥ 70 AND no high violations AND no content warnings
```

---

## Tech Stack

### Backend
| Layer | Tech |
|---|---|
| Framework | FastAPI + Python |
| AI Models | Groq (Llama 3.3 70B + Llama 4 Scout) |
| Database | Supabase (PostgreSQL) |
| File Storage | Cloudinary |
| PDF Processing | PyMuPDF |

### Frontend
| Layer | Tech |
|---|---|
| Framework | Next.js 13 (App Router) |
| Styling | Inline styles + Tailwind |
| Auth | Supabase Auth |
| HTTP | Axios |

---

## Features

- **Smart model routing** — PDF vs image → different Groq LLM automatically
- **Agentic tool selection** — anomaly detection only runs when needed
- **Currency aware** — INR, EUR, GBP, AED converted to USD before limit checks
- **Duplicate detection** — SHA-256 hashing prevents reprocessing
- **Explainable AI** — every decision comes with plain English reasoning
- **Chat interface** — upload triggers inline audit result cards
- **Full audit trail** — rejected invoices saved for compliance history
- **Responsive** — works on mobile with bottom navigation

---

## Project Structure
```
clearbill-v2/
├── backend/
│   ├── agents/
│   │   ├── orchestrator.py        # Main agentic loop
│   │   └── tools/
│   │       ├── extract.py         # OCR + field parsing
│   │       ├── validate.py        # Policy rules engine
│   │       ├── vendor.py          # Vendor history check
│   │       └── anomaly.py         # LLM fraud detection
│   ├── api/
│   │   ├── main.py                # FastAPI app entry
│   │   └── routes/
│   │       ├── upload.py          # File upload endpoint
│   │       ├── documents.py       # Invoice history
│   │       └── audit.py           # Compliance stats
│   ├── services/
│   │   ├── groq_client.py         # Model routing logic
│   │   └── cloudinary.py          # File storage
│   └── db/
│       └── supabase.py            # DB client
└── frontend/
    ├── app/
    │   ├── dashboard/page.js      # Main chat interface
    │   └── (auth)/login/page.js   # Auth page
    └── lib/
        ├── api.js                 # Backend calls
        ├── auth.js                # Auth helpers
        └── supabase.js            # Supabase client
```

---

## Database Schema
```sql
documents (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  original_filename text,
  file_type text,
  file_hash text UNIQUE,        -- duplicate detection
  cloudinary_url text,          -- null if rejected
  extracted_data jsonb,         -- all parsed fields
  audit_result jsonb,           -- violations + reasoning
  is_compliant boolean,
  compliance_score float,
  status text,                  -- approved | rejected
  created_at timestamptz
)
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/upload` | Upload and process invoice |
| GET | `/api/documents` | Get user's invoice history |
| GET | `/api/documents/{id}` | Get single invoice detail |
| GET | `/api/audit/stats` | Get compliance stats |
| GET | `/health` | Health check |

---

## Local Setup

### Backend
```bash
cd backend
python -m venv clearbill
clearbill\Scripts\activate
pip install -r requirements.txt

# Add your keys to .env
cp .env.example .env

cd api
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
# Add keys to .env.local
npm run dev
```

### Environment Variables

**Backend `.env`**
```
SUPABASE_URL=
SUPABASE_KEY=
GROQ_API_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
SECRET_KEY=
```

**Frontend `.env.local`**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## Deployment

| Service | Platform |
|---|---|
| Backend | Render |
| Frontend | Vercel |
| Database | Supabase |
| Storage | Cloudinary |

---

## Interview Notes

**Why agentic over pipeline?**
The agent makes cost-optimized decisions — anomaly detection (an expensive LLM call) only runs when signals warrant it, not on every invoice.

**Why two models?**
PDFs have extractable text — cheaper text model suffices. Images need vision capability. Routing saves tokens and improves accuracy.

**Why save rejected invoices?**
Audit trail is a compliance requirement in real expense management systems. You need to prove why something was rejected.

---

## Built with
- [Groq](https://groq.com) — LLM inference
- [Supabase](https://supabase.com) — Database + Auth
- [Cloudinary](https://cloudinary.com) — File storage
- [PyMuPDF](https://pymupdf.readthedocs.io) — PDF processing
