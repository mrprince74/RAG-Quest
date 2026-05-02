from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def ingest_files():
    return {"status" : "api is running .."}
