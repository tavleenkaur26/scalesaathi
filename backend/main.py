"""ScaleSaathi API. Run from the repo root:  uvicorn backend.main:app --reload"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend import models  # noqa: F401  (registers tables)
from backend.config import settings
from backend.db import Base, SessionLocal, engine_db
from backend.routes import admin, auth, catalog, repository, sessions
from backend.services import audit  # noqa: F401  (registers the audit hook)
from backend.services.seed import ensure_base_data, load_sample_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine_db)
    with SessionLocal() as db:
        ensure_base_data(db)
        if settings.seed_sample_on_startup:
            load_sample_data(db)
        db.commit()
    yield


app = FastAPI(title="ScaleSaathi API", version="1.0", lifespan=lifespan,
              swagger_ui_parameters={"persistAuthorization": True})
origins = ["*"] if settings.cors_origins.strip() == "*" else [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"],
                   allow_credentials=False)          # auth is a Bearer header, not cookies

for r in (auth.router, catalog.router, sessions.router, admin.router, repository.router):
    app.include_router(r)


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}
