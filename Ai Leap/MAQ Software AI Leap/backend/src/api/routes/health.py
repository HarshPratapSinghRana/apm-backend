from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def get_health():
    """
    Returns a 200 OK status to indicate that the API is running.
    """
    return {"status": "OK"}
