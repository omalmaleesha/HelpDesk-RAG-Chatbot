# HelpDesk RAG Chatbot

FastAPI-based Retrieval-Augmented Generation (RAG) service that ingests local PDFs/TXT files, stores embeddings in Chroma, reranks results, and answers queries with Groq-hosted LLMs. Swagger UI is exposed at `http://127.0.0.1:8000/docs` for quick testing.

## Tech stack
- **FastAPI** for the HTTP API and docs
- **ChromaDB + LangChain-Chroma** for vector storage
- **HuggingFace embeddings** (`sentence-transformers/all-MiniLM-L6-v2`) for encoding
- **CrossEncoder reranker** (`cross-encoder/ms-marco-MiniLM-L-6-v2`) for re-ranking top results
- **Groq LLM (OpenAI-compatible endpoint)** for answer generation (`openai/gpt-oss-120b`)
- **Python 3.12**, `python-dotenv` for env vars, `pypdf` for PDF parsing

## Prerequisites
- Python 3.12+
- A Groq API key exported as `GROQ_API_KEY`
- Local documents to ingest: place `.pdf` or `.txt` files in `storage/`

## Setup (Windows PowerShell)
```powershell
# From repo root
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies from pyproject.toml
pip install --upgrade pip
pip install chromadb fastapi[standard] groq langchain langchain-chroma langchain-community langchain-huggingface openai pypdf python-dotenv sentence-transformers

# Configure your Groq key
setx GROQ_API_KEY "<your_groq_api_key>"
```

## Run locally
Run from the project root so the `app` package is importable:
```powershell
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```
Then open Swagger UI: http://127.0.0.1:8000/docs

## How to use via Swagger UI (http://127.0.0.1:8000/docs)
1) **Health check**: `GET /` → returns `{"message": "Hello RAG"}`
2) **Load documents**: `GET /documents/load`
	- Reads all `.pdf`/`.txt` in `storage/`
	- Splits into chunks (size 500, overlap 100)
	- Embeds and writes to on-disk Chroma at `chroma_db/`
3) **Verify ingestion**: `GET /documents/verify` to see counts and sample vectors
4) **Query**: `GET /query?user_query=your question`
	- Retrieves top 8 from Chroma, reranks top 3, builds context, calls Groq LLM
	- If the automatic similarity check flags low confidence, it falls back to a human-agent hook (`app/agents/human_agent.py`)

### Example cURL calls
```powershell
# Load documents
curl "http://127.0.0.1:8000/documents/load"

# Query
curl "http://127.0.0.1:8000/query?user_query=What is in the docs?"
```

## Data & persistence
- Documents source: `storage/`
- Persisted vectors: `chroma_db/`

## Common issues
- `ModuleNotFoundError: No module named 'app'`: run uvicorn **from repo root** (e.g., `uvicorn app.main:app --reload`) or pass `--app-dir .`.
- Missing Groq key: set `GROQ_API_KEY` before starting the server.
