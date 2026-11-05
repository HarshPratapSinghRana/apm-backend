"""Solution Builder API routes."""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import uuid

from ...core.solution_builder_agent import process_message, reset_session

router = APIRouter()


class SolutionBuilderRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class SolutionBuilderResponse(BaseModel):
    message: str
    session_id: str
    active_agent: str
    completed_agents: list[str]
    blueprint: dict
    blueprint_updates: dict
    context_matches: dict


@router.post("/chat", response_model=SolutionBuilderResponse)
async def solution_builder_chat(req: SolutionBuilderRequest):
    session_id = req.session_id or str(uuid.uuid4())
    result = await process_message(session_id, req.message)
    return SolutionBuilderResponse(
        message=result["message"],
        session_id=session_id,
        active_agent=result["active_agent"],
        completed_agents=result["completed_agents"],
        blueprint=result.get("blueprint", {}),
        blueprint_updates=result.get("blueprint_updates", {}),
        context_matches=result.get("context_matches", {}),
    )


@router.post("/reset")
async def solution_builder_reset(req: SolutionBuilderRequest):
    if req.session_id:
        reset_session(req.session_id)
    return {"status": "ok"}
