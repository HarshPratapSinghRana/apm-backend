from fastapi import APIRouter
from pydantic import BaseModel
from typing import Any
from src.core.agent_instance import agent
from src.utils.input_validator import blocked_input_message, validate_user_input

router = APIRouter()

class ChatRequest(BaseModel):
    user_input: str

class ChatResponse(BaseModel):
    response: str

@router.post("/", response_model=ChatResponse)
async def chat_with_agent(request: ChatRequest) -> Any:
    is_valid, reason, sanitized_input = validate_user_input(request.user_input)
    if not is_valid:
        return ChatResponse(response=blocked_input_message(reason))

    agent_response = await agent.call_agent(sanitized_input)
    # Ensure agent_response is a string
    if not isinstance(agent_response, str):
        agent_response = str(agent_response)
    return ChatResponse(response=agent_response)
