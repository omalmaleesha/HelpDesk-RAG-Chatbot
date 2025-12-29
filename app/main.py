from fastapi import FastAPI
from .api import route  # import your router

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Hello RAG"}

# Include the router
app.include_router(route.router)


#uv run fastapi dev
