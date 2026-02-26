# human_agent.py
import os
import time
import uuid
import requests


# Default to the local Next.js human-agent API
HUMAN_AGENT_BASE_URL = os.getenv("HUMAN_AGENT_BASE_URL", "http://localhost:3000")


def send_to_human_agent(user_query: str, llm_answer: str, timeout: int | None = None, poll_interval: int = 3) -> str:
    """
    Send the LLM answer to the Next.js human agent interface and wait for a corrected answer.

    Flow:
    1) POST /api/escalations to create/update an escalation record.
    2) Poll GET /api/escalations for the escalation id until status becomes "answered".
    3) Return the correctedAnswer, or fall back to the original LLM answer on timeout/errors.
    """

    base_url = HUMAN_AGENT_BASE_URL.rstrip("/")
    escalations_url = f"{base_url}/api/escalations"

    request_id = str(uuid.uuid4())
    payload = {
        "requestId": request_id,
        "userQuery": user_query,
        "aiAnswer": llm_answer,
        "status": "pending",
    }

    try:
        response = requests.post(escalations_url, json=payload, timeout=10)
        response.raise_for_status()
        data = response.json() or {}
        escalation = data.get("escalation", {})
        escalation_id = escalation.get("id", request_id)
    except requests.RequestException as e:
        print(f"Error creating escalation: {e}")
        return llm_answer

    deadline = None if timeout is None else time.time() + timeout

    while True:
        try:
            poll_response = requests.get(escalations_url, timeout=10)
            poll_response.raise_for_status()
            escalations = poll_response.json().get("escalations", [])
            match = next((e for e in escalations if e.get("id") == escalation_id), None)

            if match and match.get("status") == "answered" and match.get("correctedAnswer"):
                return match["correctedAnswer"]
        except requests.RequestException as e:
            print(f"Error polling escalation: {e}")

        if deadline is not None and time.time() >= deadline:
            break
        time.sleep(poll_interval)

    print("Human agent response timed out; returning original LLM answer")
    return llm_answer
