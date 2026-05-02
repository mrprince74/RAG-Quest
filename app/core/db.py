from langchain_core.documents import Document
from langchain_chroma import Chroma
from app.config import CHROMA_COLLECTION_NAME, CHROMA_PERSIST_DIR
from app.core.embedder import embedder
from typing import Optional


vector_store = Chroma(
    collection_name=CHROMA_COLLECTION_NAME,
    embedding_function=embedder,
    persist_directory=CHROMA_PERSIST_DIR,
)

def get_all_documents() -> list[dict]:
    results = vector_store.get(include=["metadatas"])

    seen_hashes = set()
    documents = []

    for metadata in results["metadatas"]:
        file_hash = metadata.get("file_hash")
        if file_hash not in seen_hashes:
            seen_hashes.add(file_hash)
            documents.append({
                "title" : metadata["title"],
                "document_id" : metadata["file_hash"],
                "file_type" : metadata["file_type"],
                "total_pages" : metadata["total_pages"],
                "file_size_bytes" : metadata["file_size_bytes"],
            })

    return documents

def get_document_by_id(file_hash: str) -> Optional[dict]:
    results = vector_store.get(
        where={"file_hash": file_hash},
        include=["metadatas", "documents"],
    )

    if not results["ids"]:
        return None

    metadata = results["metadatas"][0]

    chunks = [
        {
            "chunk_id": results["ids"][i],
            "text": results["documents"][i],
            **{k: v for k, v in results["metadatas"][i].items()
               if k not in ("file_hash", "filename", "file_size_bytes",
                            "file_type", "ingested_at", "page_count", "source")},
        }
        for i in range(len(results["ids"]))
    ]

    return {
        **metadata,
        "total_chunks": len(chunks),
        "chunks": chunks,
    }


def save(chunks: list[Document], vectors: list[list[float]]) -> list[str]:
    ids = [chunk.metadata["id"] for chunk in chunks]
    texts = [chunk.page_content for chunk in chunks]
    metadatas = [chunk.metadata for chunk in chunks]

    vector_store.add_texts(
        texts=texts,
        embeddings=vectors,
        metadatas=metadatas,
        ids=ids,
    )

    return ids

def search(question_vector: list[float], k: int = 5) -> list[dict]:
    results = vector_store.similarity_search_by_vector_with_relevance_scores(
        embedding=question_vector,
        k=k,
    )

    return [
        {
            "chunk_id": doc.metadata.get("id"),
            "text": doc.page_content,
            "filename": doc.metadata.get("filename"),
            "source_type": doc.metadata.get("source_type", "file"),
            "page": doc.metadata.get("page"),
            "confidence": round(1 / (1 + score), 4),
        }
        for doc,score in results
    ]
