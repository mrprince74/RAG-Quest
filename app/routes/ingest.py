import os
from fastapi import APIRouter, HTTPException, UploadFile
from app.config import ALLOWED_EXTENSIONS
from app.services import ingestion_service


router = APIRouter()

@router.post("/ingest/files")
async def ingest_files(files: list[UploadFile]):
    for file in files:
        _, extension = os.path.splitext(str(file.filename))
        if extension not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Extension '{extension}' not allowed. Accepted: {ALLOWED_EXTENSIONS}"
            )

    results = [await ingestion_service.ingest_file(file) for file in files]
    return results


