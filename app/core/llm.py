from groq import Groq
import os
from dotenv import load_dotenv

from openai import OpenAI


load_dotenv()  

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

client = OpenAI(
    api_key=os.environ.get("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1",
)
def generate_answer(query: str, context: str) -> str:
    prompt = f"""
Answer the question strictly using the context below.

Context:
{context}

Question:
{query}

Answer:
"""

    completion = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.5,
        max_completion_tokens=1024,
        top_p=1
    )

    return completion.choices[0].message.content
