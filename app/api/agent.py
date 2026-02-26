# agent.py
from fastapi import APIRouter, Body
from pydantic import BaseModel

agent = APIRouter()

# Temporary in-memory store for simplicity
human_queue = []

class HumanAssistRequest(BaseModel):
    query: str
    llm_answer: str

class HumanAssistResponse(BaseModel):
    corrected_answer: str

@agent.post("/human-assist", response_model=HumanAssistResponse)
def human_assist(request: HumanAssistRequest):
    """
    Receive query + LLM answer, human reviews and sends corrected answer.
    For demo purposes, this just appends "[Human corrected]" to the answer.
    """
    # In production, this could be a UI where humans correct answers
    corrected_answer = f"[Human corrected] {request.llm_answer}"
    
    # Store in queue/log for audit
    human_queue.append({
        "query": request.query,
        "original_llm_answer": request.llm_answer,
        "corrected_answer": corrected_answer
    })

    return {"corrected_answer": corrected_answer}


@agent.get("/human-assist/all")
def get_all_human_assist():
    """
    Get all queries where LLM answers were sent for human correction.
    """
    return {"human_assist_queue": human_queue}
