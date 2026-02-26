from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import agent
from .api import route  # import your router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Hello RAG"}


@app.get("/health")
def health():
    return {"status": "ok"}

# Include the router
app.include_router(route.router)
app.include_router(agent.agent)

#uv run fastapi dev
