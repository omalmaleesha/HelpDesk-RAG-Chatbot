from sentence_transformers import SentenceTransformer, util

# Embedding model for similarity checking
verification_model = SentenceTransformer("all-MiniLM-L6-v2")

def verify_llm_answer(answer: str, context_docs: list[str], threshold: float = 0.7) -> bool:
    """
    Return True if answer is likely correct, False if it needs human review.
    Compares answer embeddings with context embeddings.
    """
    if not context_docs:
        return False
    
    answer_emb = verification_model.encode(answer, convert_to_tensor=True)
    context_embs = verification_model.encode(context_docs, convert_to_tensor=True)
    
    similarities = util.cos_sim(answer_emb, context_embs)
    max_sim = similarities.max().item()
    
    # If similarity is low, consider answer incorrect
    return max_sim >= threshold