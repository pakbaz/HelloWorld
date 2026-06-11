from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routes import prompts, tags

Base.metadata.create_all(bind=engine)

app = FastAPI(title="PromptForge API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(prompts.router, prefix="/api")
app.include_router(tags.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
