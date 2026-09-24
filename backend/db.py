from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from backend.config import settings


def _normalise(url: str) -> str:
    """Neon/Supabase hand out postgres:// or postgresql:// URLs; we use the psycopg3 driver."""
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


url = _normalise(settings.database_url)
kwargs = {"pool_pre_ping": True}          # Neon suspends idle connections; re-check before use
if url.startswith("sqlite"):
    kwargs["connect_args"] = {"check_same_thread": False}
else:
    kwargs["pool_recycle"] = 300

engine_db = create_engine(url, **kwargs)
SessionLocal = sessionmaker(bind=engine_db, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
