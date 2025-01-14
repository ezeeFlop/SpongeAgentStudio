from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Body
from typing import List, Set, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.crew_service import CrewService
from app.schemas.crew import Crew, CrewCreate, CrewUpdate
from app.engine.websocket import ws_manager
import logging
from pydantic import BaseModel
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter()

async def get_crew_service(db: AsyncSession = Depends(get_db)) -> CrewService:
    return CrewService(db)

@router.post("", response_model=Crew)
async def create_crew(
    crew: CrewCreate,
    service: CrewService = Depends(get_crew_service)
):
    return await service.create_crew(crew)

@router.get("", response_model=List[Crew])
async def list_crews(
    skip: int = 0,
    limit: int = 100,
    service: CrewService = Depends(get_crew_service)
):
    return await service.list_crews(skip, limit)

@router.get("/{crew_id}", response_model=Crew)
async def get_crew(
    crew_id: str,
    service: CrewService = Depends(get_crew_service)
):
    crew = await service.get_crew(crew_id)
    if crew is None:
        raise HTTPException(status_code=404, detail="Crew not found")
    return crew

@router.put("/{crew_id}", response_model=Crew)
async def update_crew(
    crew_id: str,
    crew: CrewUpdate,
    service: CrewService = Depends(get_crew_service)
):
    updated_crew = await service.update_crew(crew_id, crew)
    if updated_crew is None:
        raise HTTPException(status_code=404, detail="Crew not found")
    return updated_crew

@router.delete("/{crew_id}")
async def delete_crew(
    crew_id: str,
    service: CrewService = Depends(get_crew_service)
):
    success = await service.delete_crew(crew_id)
    if not success:
        raise HTTPException(status_code=404, detail="Crew not found")
    return {"message": "Crew deleted successfully"}

@router.post("/{crew_id}/agents/{agent_id}", response_model=Crew)
async def add_agent_to_crew(
    crew_id: str,
    agent_id: str,
    service: CrewService = Depends(get_crew_service)
):
    crew = await service.add_agent_to_crew(crew_id, agent_id)
    if crew is None:
        raise HTTPException(status_code=404, detail="Crew or Agent not found")
    return crew

@router.delete("/{crew_id}/agents/{agent_id}", response_model=Crew)
async def remove_agent_from_crew(
    crew_id: str,
    agent_id: str,
    service: CrewService = Depends(get_crew_service)
):
    crew = await service.remove_agent_from_crew(crew_id, agent_id)
    if crew is None:
        raise HTTPException(status_code=404, detail="Crew or Agent not found")
    return crew

@router.websocket("/{crew_id}/ws")
async def websocket_endpoint(websocket: WebSocket, crew_id: str):
    """WebSocket endpoint for crew execution monitoring"""
    try:
        await ws_manager.connect(websocket, crew_id)
        logger.info(f"WebSocket client connected for crew {crew_id}")
        
        try:
            while True:
                # Keep the connection alive and wait for disconnection
                data = await websocket.receive_text()
                # Handle any incoming messages if needed
        except WebSocketDisconnect:
            logger.info(f"WebSocket client disconnected from crew {crew_id}")
        finally:
            await ws_manager.disconnect(websocket, crew_id)
    except Exception as e:
        logger.error(f"WebSocket error for crew {crew_id}: {str(e)}")
        try:
            await websocket.close()
        except:
            pass  # Already closed or failed to close

class CrewExecuteRequest(BaseModel):
    inputs: Optional[Dict[str, str]] = {}

@router.post("/{crew_id}/execute")
async def execute_crew(
    crew_id: str,
    request: CrewExecuteRequest,
    service: CrewService = Depends(get_crew_service)
):
    """Execute a crew and return the results
    
    Args:
        crew_id: ID of the crew to execute
        request: Request body containing inputs for variable interpolation
        
    Returns:
        Dict containing execution results
    """
    logger.info(f"Executing crew {crew_id} with inputs: {request.inputs}")
    return await service.execute_crew(crew_id, request.inputs)

@router.get("/{crew_id}/variables", response_model=Set[str])
async def get_crew_variables(
    crew_id: str,
    service: CrewService = Depends(get_crew_service)
):
    """Get all required variables for a crew's execution"""
    try:
        logger.info(f"Getting crew variables for crew {crew_id}")
        variables = await service.get_crew_variables(crew_id)
        return variables
    except ValueError as e:
        if "No valid tasks found" in str(e):
            # Return empty set for crews without valid configuration
            return set()
        raise HTTPException(status_code=404, detail=str(e)) 