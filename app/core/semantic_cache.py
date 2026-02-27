from __future__ import annotations

from typing import Iterable, Sequence, Tuple
import math


class SemanticCache:
    """Very simple in-memory semantic cache with hard-coded entries."""

    def __init__(self, threshold: float = 0.92, max_entries: int = 200):
        self.threshold = threshold
        self.max_entries = max_entries
        self.entries = [
            {
                "vector": [0.1, 0.2, 0.3, 0.4],
                "answer": "Refer to the employee handbook section 3.2 for PTO details.",
            },
            {
                "vector": [0.05, 0.15, 0.25, 0.45],
                "answer": "Our refund policy is outlined in the customer care portal.",
            },
        ]

    @staticmethod
    def _cosine_similarity(a: Sequence[float], b: Sequence[float]) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x * x for x in a))
        norm_b = math.sqrt(sum(y * y for y in b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    def check(self, query_vector: Iterable[float]) -> Tuple[bool, str | None]:
        best_score = -1.0
        best_answer = None

        for entry in self.entries:
            score = self._cosine_similarity(query_vector, entry["vector"])
            if score > best_score:
                best_score = score
                best_answer = entry["answer"]

        if best_score >= self.threshold:
            return True, best_answer

        return False, None

    def add(self, query_vector: Iterable[float], answer: str) -> None:
        vector_list = list(query_vector)
        if not vector_list:
            return

        self.entries.append({"vector": vector_list, "answer": answer})
        if len(self.entries) > self.max_entries:
            # simple FIFO eviction
            self.entries.pop(0)


_semantic_cache = SemanticCache()


def check_semantic_cache(query_vector: Iterable[float]) -> Tuple[bool, str | None]:
    """Return (hit, answer) for the given query vector."""
    return _semantic_cache.check(list(query_vector))


def add_to_semantic_cache(query_vector: Iterable[float], answer: str) -> None:
    """Store a new vector-answer pair in the semantic cache."""
    _semantic_cache.add(list(query_vector), answer)