from pathlib import Path
from .loader import load_file
from .splitter import chunk_text

STORAGE_PATH = Path(r"C:\icet\RAG\storage")


def load_and_chunk_documents():
    all_chunks = []

    for file in STORAGE_PATH.iterdir():
        if file.suffix.lower() not in [".pdf", ".txt"]:
            continue

        text = load_file(file)
        chunks = chunk_text(text)

        for idx, chunk in enumerate(chunks):
            all_chunks.append({
                "text": chunk,
                "metadata": {
                    "source": file.name,
                    "chunk_id": idx
                }
            })

    return all_chunks
