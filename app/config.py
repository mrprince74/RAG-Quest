from langchain_community.document_loaders import PyMuPDFLoader, TextLoader, UnstructuredMarkdownLoader

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md"}
FILE_LOADERS = {".txt" : TextLoader, ".pdf" : PyMuPDFLoader, ".md" : UnstructuredMarkdownLoader}
CHUNK_SIZE = 400
CHUNK_OVERLAP = 100
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
CHROMA_COLLECTION_NAME = "documents"
CHROMA_PERSIST_DIR = "./chroma_db"