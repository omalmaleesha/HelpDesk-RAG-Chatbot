import os
from pathlib import Path

import chromadb
from langchain_chroma import Chroma


CHROMA_DB_PATH = Path(__file__).resolve().parents[2] / "chroma_db"

if not CHROMA_DB_PATH.exists():
    os.makedirs(CHROMA_DB_PATH, exist_ok=True)

chroma_client = chromadb.PersistentClient(
    path=str(CHROMA_DB_PATH)
)

collection = chroma_client.get_or_create_collection(
    name="my_collection"
)


def get_chroma_client():
    return chroma_client


def get_chroma_collection():
    return collection


def get_vector_store(embeddings):
    """Return a LangChain Chroma vector store backed by the on-disk
    chroma database located at CHROMA_DB_PATH.

    Args:
        embeddings: an embeddings object compatible with LangChain (e.g.
            an instance of HuggingFaceEmbeddings or any object exposing the
            embed_documents/embed_query interface accepted by LangChain).

    Returns:
        langchain.vectorstores.Chroma instance pointed at CHROMA_DB_PATH.
    """
    return Chroma(persist_directory=str(CHROMA_DB_PATH), embedding_function=embeddings)
