from fastapi import APIRouter, Query
from ..core.document_service import load_and_chunk_documents
from ..core.embeddings import get_embedding_model
from ..db.chromaDB import get_chroma_client, get_chroma_collection, get_vector_store
import uuid
from openai import OpenAI
import os
from dotenv import load_dotenv
import requests
import json
from groq import Groq

router = APIRouter()

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
    embeddings = get_embedding_model()

    # Load persisted LangChain vector store
    vector_store = get_vector_store(embeddings)

    # Access the underlying Chroma collection (read-only)
    collection = vector_store._collection

    all_docs = collection.get(
        include=["documents", "metadatas", "embeddings"]
    )

    total_docs = len(all_docs.get("documents", []))

    sample_docs = all_docs.get("documents", [])[:2]
    sample_metadata = all_docs.get("metadatas", [])[:2]

    # embeddings may be None if not requested
    raw_vectors = all_docs.get("embeddings") or []
    sample_vectors = [list(vec) for vec in raw_vectors[:2]]

    return {
        "status": "success",
        "storage": "persistent",
        "db_path": str(vector_store._persist_directory),
        "total_docs": total_docs,
        "sample_docs": sample_docs,
        "sample_vectors": sample_vectors,
        "sample_metadata": sample_metadata,
    }


@router.get("/query")
def query_documents(user_query: str = Query(..., description="Your search query")):
    """
    Search the Chroma collection for the most similar documents to the user query.
    """
    embedding_model = get_embedding_model()
    # Get the Chroma collection
    # Load persisted LangChain vector store
    vector_store = get_vector_store(embedding_model)

    # Access the underlying Chroma collection (read-only)
    collection = vector_store._collection

    # Embed the user query
    query_vector = embedding_model.embed_query(user_query)

    # Query the collection (top 3 results)
    results = collection.query(
        query_embeddings=[query_vector],
        n_results=3,
        include=["documents", "metadatas", "distances"]
    )

    top_docs = results["documents"][0] if results["documents"] else []
    top_metas = results["metadatas"][0] if results["metadatas"] else []

    # Step 4: Prepare context for LLM
    context_text = "\n\n".join([f"{meta}: {doc}" for meta, doc in zip(top_metas, top_docs)])
    prompt = (
        f"Answer the following question based on the context below.\n\n"
        f"Context:\n{context_text}\n\n"
        f"Question: {user_query}\n\n"
        f"Explain your reasoning step by step and then give the final answer."
    )

    # Step 5: Call Groq LLM
    try:
        completion = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_completion_tokens=1024,
            top_p=1
        )

        llm_answer = completion.choices[0].message.content

    except Exception as e:
        llm_answer = f"Error calling LLM: {str(e)}"

    return {
        "query": user_query,
        "top_documents": top_docs,
        "top_metadatas": top_metas,
        "llm_answer": llm_answer
    }