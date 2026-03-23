from typing import Any, Dict, List, Tuple

from rank_bm25 import BM25Okapi

bm25_index: BM25Okapi | None = None
bm25_documents: List[str] = []
bm25_metadatas: List[Dict[str, Any]] = []


def build_bm25_index_from_documents(
    documents: List[str],
    metadatas: List[Dict[str, Any]] | None = None,
) -> BM25Okapi | None:
    """Build and cache a BM25 index from raw documents.

    Args:
        documents: List of document strings.
        metadatas: Optional list of metadata dicts aligned to documents.

    Returns:
        A BM25Okapi index or None if no documents were provided.
    """
    global bm25_index, bm25_documents, bm25_metadatas

    bm25_documents = documents or []
    if metadatas and len(metadatas) == len(bm25_documents):
        bm25_metadatas = metadatas
    else:
        bm25_metadatas = [{} for _ in bm25_documents]

    tokenized_docs = [doc.split() for doc in bm25_documents]
    bm25_index = BM25Okapi(tokenized_docs) if tokenized_docs else None
    return bm25_index


def build_bm25_index_from_collection(collection) -> BM25Okapi | None:
    """Build BM25 index from an existing Chroma collection."""
    data = collection.get(include=["documents", "metadatas"])
    documents = data.get("documents", []) or []
    metadatas = data.get("metadatas", []) or [{} for _ in documents]
    return build_bm25_index_from_documents(documents, metadatas)


def ensure_bm25_index(collection) -> Tuple[BM25Okapi | None, List[str], List[Dict[str, Any]]]:
    """Ensure a BM25 index is available; build it lazily from the collection."""
    global bm25_index
    if bm25_index is None or not bm25_documents:
        build_bm25_index_from_collection(collection)
    return bm25_index, bm25_documents, bm25_metadatas


def hybrid_retrieve_with_scores(
    query: str,
    embedding_model,
    collection,
    bm25: BM25Okapi | None,
    documents: List[str],
    metadatas: List[Dict[str, Any]] | None = None,
    k: int = 8,
    alpha: float = 0.6,
    query_vector=None,
):
    """Combine vector search and BM25, returning scored docs and metadata.

    Args:
        query: User query text.
        embedding_model: Embedding model exposing embed_query.
        collection: Chroma collection for vector search.
        bm25: BM25Okapi index.
        documents: Raw documents aligned with the BM25 index.
        metadatas: Optional metadatas aligned with documents.
        k: Number of results to return.
        alpha: Weight for vector scores (1-alpha for BM25).
        query_vector: Optional precomputed query embedding.

    Returns:
        List of dicts with document, metadata, and combined score.
    """
    if metadatas is None:
        metadatas = [{} for _ in documents]

    effective_query_vector = query_vector or embedding_model.embed_query(query)

    vector_results = collection.query(
        query_embeddings=[effective_query_vector],
        n_results=k,
        include=["documents", "metadatas", "distances"],
    )

    vector_docs = vector_results.get("documents", [[]])[0] if vector_results.get("documents") else []
    vector_metas = vector_results.get("metadatas", [[]])[0] if vector_results.get("metadatas") else []
    vector_distances = vector_results.get("distances", [[]])[0] if vector_results.get("distances") else []

    combined: Dict[str, Dict[str, Any]] = {}

    vector_scores = [1 / (1 + d) if d is not None else 0 for d in vector_distances]
    for doc, meta, score in zip(vector_docs, vector_metas, vector_scores):
        if doc is None:
            continue
        entry = combined.setdefault(doc, {"document": doc, "metadata": meta or {}, "score": 0})
        entry["score"] += alpha * score

    if bm25 and documents:
        tokenized_query = query.split()
        bm25_raw_scores = bm25.get_scores(tokenized_query)
        max_bm25 = max(bm25_raw_scores) if len(bm25_raw_scores) > 0 else 0
        norm = max_bm25 if max_bm25 > 0 else 1
        bm25_scores = [s / norm for s in bm25_raw_scores]

        for idx, score in enumerate(bm25_scores):
            doc = documents[idx]
            meta = metadatas[idx] if idx < len(metadatas) else {}
            entry = combined.setdefault(doc, {"document": doc, "metadata": meta or {}, "score": 0})
            entry["score"] += (1 - alpha) * score

    ranked = sorted(combined.values(), key=lambda x: x["score"], reverse=True)
    return ranked[:k]
