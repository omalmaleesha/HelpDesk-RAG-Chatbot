from pathlib import Path
from pypdf import PdfReader


def load_txt(file_path: Path) -> str:
    return file_path.read_text(encoding="utf-8", errors="ignore")


def load_pdf(file_path: Path) -> str:
    reader = PdfReader(file_path)
    text = []
    for page in reader.pages:
        content = page.extract_text()
        if content:
            text.append(content)
    return "\n".join(text)


def load_file(file_path: Path) -> str:
    if file_path.suffix.lower() == ".txt":
        return load_txt(file_path)
    elif file_path.suffix.lower() == ".pdf":
        return load_pdf(file_path)
    else:
        raise ValueError("Unsupported file type")
