from fastapi import FastAPI
from .api import agent
from .api import route  # import your router

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Hello RAG"}

# Include the router
app.include_router(route.router)
app.include_router(agent.agent)

#uv run fastapi dev
