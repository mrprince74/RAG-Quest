from fastapi import FastAPI
from app.routes import root, ingest, docs

app = FastAPI()


app.include_router(root.router, prefix="/api")
app.include_router(ingest.router, prefix="/api")
app.include_router(docs.router, prefix="/api", tags=["Documents"])
