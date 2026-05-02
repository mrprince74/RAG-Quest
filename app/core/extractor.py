import os
import tempfile
from fastapi import UploadFile
from langchain_core.documents import Document
from app.core.hasher import compute_hash
from app.config import FILE_LOADERS
from datetime import datetime


async def extract(file: UploadFile) -> tuple[list[Document], str]:
    content = await file.read()
    file_hash = compute_hash(content)
    
    _, extension = os.path.splitext(str(file.filename))
    
    temp_file = tempfile.NamedTemporaryFile("wb", suffix=extension, delete=False)
    temp_file.write(content)
    temp_file.close()

    try:
        loader = FILE_LOADERS[extension](temp_file.name)
        docs = loader.load()

        for doc in docs:
            doc.metadata = {
                **doc.metadata,                                    
                "file_hash": file_hash,
                "filename": file.filename,
                "file_size_bytes": len(content),
                "file_type": extension.lstrip("."),
                "ingested_at": str(datetime.now()),
            }

        return docs, file_hash

    finally:
        os.unlink(temp_file.name)