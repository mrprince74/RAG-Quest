from fastapi import APIRouter, HTTPException
from app.models.query import QueryRequest, QueryResponse
from app.services import query_service

router = APIRouter()

@router.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    return await query_service.query(request)