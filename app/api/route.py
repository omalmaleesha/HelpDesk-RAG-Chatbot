from fastapi import APIRouter, Query

from app.core.llm import generate_answer
from ..core.document_service import load_and_chunk_documents
from ..core.embeddings import get_embedding_model
from ..core.semantic_cache import check_semantic_cache, add_to_semantic_cache
from ..db.chromaDB import get_chroma_client, get_chroma_collection, get_vector_store
from ..core.reranker import Reranker
from ..core.bm25 import (
    build_bm25_index_from_documents,
    ensure_bm25_index,
    hybrid_retrieve_with_scores,
)
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

    metadatas = [chunk["metadata"] for chunk in chunks]

    vector_store.add_texts(texts=texts, metadatas=metadatas, ids=ids)

    # Build BM25 index for hybrid retrieval
    build_bm25_index_from_documents(texts, metadatas)

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

    # semantic cache check
    cache_hit, cached_answer = check_semantic_cache(query_vector)
    if cache_hit and cached_answer:
        return {
            "query": user_query,
            "retrieved_docs": 0,
            "top_documents_before_rerank": [],
            "top_documents_after_rerank": [],
            "top_metadatas": [],
            "llm_answer": cached_answer,
            "final_answer": cached_answer,
            "human_answer": None,
            "verified_correct": True,
            "source": "semantic_cache"
        }


    # Build or reuse BM25 index for hybrid search
    bm25_index, bm25_documents, bm25_metadatas = ensure_bm25_index(collection)

    hybrid_results = hybrid_retrieve_with_scores(
        query=user_query,
        embedding_model=embedding_model,
        collection=collection,
        bm25=bm25_index,
        documents=bm25_documents,
        metadatas=bm25_metadatas,
        k=12,  # retrieve more for reranker
        query_vector=query_vector,
    )

    docs = [item["document"] for item in hybrid_results]
    metas = [item.get("metadata", {}) for item in hybrid_results]

    # Store the original top 3 before rerank
    top_before_rerank = docs[:3]

    # Apply reranker for top 3 results
    reranked_docs = reranker.rerank(user_query, docs, top_k=3)

    metadata_map = {}
    for doc, meta in zip(docs, metas):
        metadata_map.setdefault(doc, meta)

    top_metadatas = [metadata_map.get(doc, {}) for doc in reranked_docs[:3]]

    # Build context from reranked docs
    context_text = "\n\n".join(reranked_docs)

    # LLM call
    try:
        llm_answer = generate_answer(user_query, context_text)
    except Exception as e:
        llm_answer = f"Error calling LLM: {str(e)}"

    # Automatic verification
    is_correct = verify_llm_answer(llm_answer, reranked_docs)
    human_answer = None

    if not is_correct:
        # Block until human agent responds (no timeout). Adjust timeout in send_to_human_agent if needed.
        human_answer = send_to_human_agent(user_query, llm_answer, timeout=None)

    final_answer = human_answer or llm_answer

    # store query + answer for future cache hits
    add_to_semantic_cache(query_vector, final_answer)

    return {
        "query": user_query,
        "retrieved_docs": len(docs),
        "top_documents_before_rerank": top_before_rerank,
        "top_documents_after_rerank": reranked_docs,
        "top_metadatas": top_metadatas,
        "llm_answer": llm_answer,
        "final_answer": final_answer,
        "human_answer": human_answer,
        "verified_correct": is_correct
    }