from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.agent_service import AgentService
from app.schemas.agent import Agent, AgentCreate, AgentUpdate

router = APIRouter()

async def get_agent_service(db: AsyncSession = Depends(get_db)) -> AgentService:
    return AgentService(db)

@router.post("", response_model=Agent)
async def create_agent(
    agent: AgentCreate,
    service: AgentService = Depends(get_agent_service)
):
    return await service.create_agent(agent)

@router.get("", response_model=List[Agent])
async def list_agents(
    skip: int = 0,
    limit: int = 100,
    service: AgentService = Depends(get_agent_service)
):
    return await service.list_agents(skip, limit)

@router.get("/{agent_id}", response_model=Agent)
async def get_agent(
    agent_id: str,
    service: AgentService = Depends(get_agent_service)
):
    agent = await service.get_agent(agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent

@router.put("/{agent_id}", response_model=Agent)
async def update_agent(
    agent_id: str,
    agent: AgentUpdate,
    service: AgentService = Depends(get_agent_service)
):
    updated_agent = await service.update_agent(agent_id, agent)
    if updated_agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    return updated_agent

@router.delete("/{agent_id}")
async def delete_agent(
    agent_id: str,
    service: AgentService = Depends(get_agent_service)
):
    success = await service.delete_agent(agent_id)
    if not success:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"message": "Agent deleted successfully"} 