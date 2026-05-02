import os
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI
from app.routes import root, ingest, docs
from app.routes.ai import query

app = FastAPI()
app.include_router(root.router, prefix="/api")
app.include_router(ingest.router, prefix="/api")
app.include_router(docs.router, prefix="/api", tags=["Documents"])
app.include_router(query.router, prefix="/api/ai", tags=["AI"])
