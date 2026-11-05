"""Solution Builder API routes."""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

from src.core.builder_agent import builder_agent

router = APIRouter()


class BuilderChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: Optional[str] = None
    wizard_answers: Optional[Dict[str, str]] = None


class BuilderChatResponse(BaseModel):
    session_id: str
    reply: str
    outputs: Optional[Dict[str, Any]] = None
    active_tab: Optional[str] = None


@router.post("/chat", response_model=BuilderChatResponse)
async def builder_chat(request: BuilderChatRequest):
    """Process a Solution Builder chat message or wizard completion."""
    result = await builder_agent.process_message(
        session_id=request.session_id,
        message=request.message,
        wizard_answers=request.wizard_answers,
    )
    return BuilderChatResponse(**result)
