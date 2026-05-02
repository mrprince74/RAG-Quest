from fastapi import APIRouter, HTTPException
from app.core import db

router = APIRouter()

@router.get("/docs")
async def get_docs():
    documents = db.get_all_documents()
    return {"total": len(documents), "documents": documents}


@router.get("/docs/{file_hash}")
async def get_document(file_hash: str):
    document = db.get_document_by_id(file_hash)

    if document is None:
        raise HTTPException(status_code=404, detail=f"Document with id '{file_hash}' not found")

    return document