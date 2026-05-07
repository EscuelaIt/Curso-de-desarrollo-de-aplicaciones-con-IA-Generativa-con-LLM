from fastapi import APIRouter, Depends
from ..auth import require_token
from ..config import settings
from ..llm.adapter import available_models

router = APIRouter(prefix="/api", dependencies=[Depends(require_token)])

@router.get("/llm/models")
async def list_models():
    return {"default": settings.llm_model, "available": available_models()}
