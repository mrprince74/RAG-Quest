from app.core import embedder, db
from app.models.query import QueryRequest, QueryResponse
from app.config import GEMINI_MODEL
from langchain_google_genai import ChatGoogleGenerativeAI
import os

model = ChatGoogleGenerativeAI(model=GEMINI_MODEL, google_api_key=os.environ["GOOGLE_API_KEY"])

async def query(request: QueryRequest) -> QueryResponse:
    question_vector = embedder.embedder.embed_query(request.question)

    sources = db.search(question_vector)

    if not sources:
        return QueryResponse(
            question=request.question,
            answer="I could not find any relevant information to answer your question.",
            sources=[],
        )

    context = "\n\n".join(
        f"[{s['filename'] or s['source_type']}]: {s['text']}"
        for s in sources
    )

    prompt = f"""You are a helpful assistant. Answer the question using only the context below.
If the answer is not in the context, say you don't know.

Context:
{context}

Question: {request.question}
Answer:"""

    response = model.invoke(prompt)

    return QueryResponse(
        question=request.question,
        answer=response.content.strip(),
        sources=sources,
    )