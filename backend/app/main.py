from app.database import engine
from app.models import Base
from app.routes import prompts, tags, variables
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

Base.metadata.create_all(bind=engine)

app = FastAPI(title="PromptForge API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(prompts.router, prefix="/prompts", tags=["prompts"])
app.include_router(variables.router, tags=["variables"])
app.include_router(tags.router, prefix="/tags", tags=["tags"])


@app.get("/health")
def health_check():
    return {"status": "ok"}
