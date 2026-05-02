from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.config import CHUNK_SIZE, CHUNK_OVERLAP

def chunk(docs: list[Document], file_hash: str) -> list[Document]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ".", "?", "!", " ", ""],
    )

    chunks = splitter.split_documents(docs)

    for i, chunk in enumerate(chunks):
        chunk_id = f"{file_hash}_{i}"
        chunk.metadata["id"] = chunk_id
        chunk.id = chunk_id

    return chunks