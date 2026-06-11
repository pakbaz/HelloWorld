import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

load_dotenv()

# Build URL from individual parts when DATABASE_URL is not set.
# Default values match the docker-compose.yml service credentials.
_default_url = (
    "postgresql://"
    + os.environ.get("POSTGRES_USER", "promptforge")
    + ":"
    + os.environ.get("POSTGRES_PASSWORD", "promptforge")
    + "@"
    + os.environ.get("POSTGRES_HOST", "localhost")
    + ":"
    + os.environ.get("POSTGRES_PORT", "5432")
    + "/"
    + os.environ.get("POSTGRES_DB", "promptforge")
)
DATABASE_URL = os.environ.get("DATABASE_URL", _default_url)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
