# human_agent.py
import requests

HUMAN_AGENT_API_URL = "http://localhost:8000/human-assist"  # Replace with your human agent endpoint

def send_to_human_agent(user_query: str, llm_answer: str) -> str:
    """
    Send the LLM-generated answer and user query to a human agent endpoint
    and wait for corrected answer.
    """
    payload = {
        "query": user_query,
        "llm_answer": llm_answer
    }

    try:
        response = requests.post(HUMAN_AGENT_API_URL, json=payload, timeout=60)
        response.raise_for_status()
        data = response.json()
        corrected_answer = data.get("corrected_answer", llm_answer)
        return corrected_answer
    except requests.RequestException as e:
        # If human agent is unavailable, fallback to original LLM answer
        print(f"Error sending to human agent: {e}")
        return llm_answer
