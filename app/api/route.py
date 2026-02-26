from fastapi import APIRouter, Query

from app.core.llm import generate_answer
from ..core.document_service import load_and_chunk_documents
from ..core.embeddings import get_embedding_model
from ..db.chromaDB import get_chroma_client, get_chroma_collection, get_vector_store
from ..core.reranker import Reranker
import uuid
from openai import OpenAI
import os
from dotenv import load_dotenv
import requests
import json
from groq import Groq
from ..utils.validations import verify_llm_answer
from ..agents.human_agent import send_to_human_agent

router = APIRouter()
reranker = Reranker()

load_dotenv()  

# Get API key
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

client = OpenAI(
    api_key=os.environ.get("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1",
)

# Initialize Groq client
groq_client = Groq()


@router.get("/documents/load")
def load_documents():
    chunks = load_and_chunk_documents()
    embedding_model = get_embedding_model()
    texts = [chunk["text"] for chunk in chunks]

    vector_store = get_vector_store(embedding_model)

    # Generate unique IDs for the texts
    ids = [str(uuid.uuid4()) for _ in chunks]

    vector_store.add_texts(texts=texts, metadatas=[chunk["metadata"] for chunk in chunks], ids=ids)

    return {
        "status": "success",
        "total_chunks": len(chunks),
        "vectors": len(texts),
        "sample": chunks[:2]
    }


@router.get("/documents/verify")
def verify_documents():
    collection = get_chroma_collection()
    
    all_docs = collection.get(include=["documents", "embeddings", "metadatas"])

    total_docs = len(all_docs["documents"])
    sample_docs = all_docs["documents"][:2]
    
    # Safely get embeddings
    raw_vectors = all_docs.get("embeddings", [])
    sample_vectors = [list(vec) for vec in raw_vectors[:2]]

    sample_metadata = all_docs["metadatas"][:2]

    return {
        "status": "success",
        "total_docs": total_docs,
        "sample_docs": sample_docs,
        "sample_vectors": sample_vectors,
        "sample_metadata": sample_metadata
    }


@router.get("/query")
def query_documents(user_query: str = Query(..., description="Your search query")):
    embedding_model = get_embedding_model()

    # Load persisted Chroma DB
    vector_store = get_vector_store(embedding_model)
    collection = vector_store._collection

    # Embed query
    query_vector = embedding_model.embed_query(user_query)

    # Retrieve MORE docs for reranking
    results = collection.query(
        query_embeddings=[query_vector],
        n_results=8,  # retrieve more for reranker
        include=["documents", "metadatas"]
    )

    docs = results["documents"][0] if results["documents"] else []
    metas = results["metadatas"][0] if results["metadatas"] else []

    # Store the original top 3 before rerank
    top_before_rerank = docs[:3]

    # Apply reranker for top 3 results
    reranked_docs = reranker.rerank(user_query, docs, top_k=3)

    # Build context from reranked docs
    context_text = "\n\n".join(reranked_docs)

    # LLM call
    try:
        llm_answer = generate_answer(user_query, context_text)
    except Exception as e:
        llm_answer = f"Error calling LLM: {str(e)}"

    # Automatic verification
    is_correct = verify_llm_answer(llm_answer, reranked_docs)
    final_answer = llm_answer
    human_answer = None

    if not is_correct:
    # Send to human agent for correction
        human_answer = send_to_human_agent(user_query, llm_answer)

    return {
        "query": user_query,
        "retrieved_docs": len(docs),
        "top_documents_before_rerank": top_before_rerank,
        "top_documents_after_rerank": reranked_docs,
        "top_metadatas": metas[:3],
        "llm_answer": llm_answer,
        "final_answer": final_answer,
        "human_answer": human_answer,
        "verified_correct": is_correct
    }