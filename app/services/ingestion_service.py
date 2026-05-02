from typing import Dict
from fastapi import UploadFile
from langchain_core.documents import Document
from app.core import chunker, extractor, embedder, db

async def ingest_file(file: UploadFile) -> Dict:
    docs, file_hash = await extractor.extract(file)
    chunks = chunker.chunk(docs, file_hash)
    vectors = await embedder.embed(chunks)
    ids = db.save(chunks, vectors)
    return {"stored": len(ids), "ids": ids}

