from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from app.config import EMBEDDING_MODEL

embedder = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)

async def embed(chunks: list[Document]) -> list[list[float]]:
    texts = [chunk.page_content for chunk in chunks]
    vectors = embedder.embed_documents(texts)
    return vectors