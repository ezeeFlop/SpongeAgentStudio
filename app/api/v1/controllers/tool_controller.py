from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.tool_service import ToolService
from app.schemas.tool import ToolResponse, ToolSchema

router = APIRouter()

async def get_tool_service(db: AsyncSession = Depends(get_db)) -> ToolService:
    return ToolService(db)

@router.get("", response_model=ToolResponse)
async def list_tools(
    service: ToolService = Depends(get_tool_service)
):
    """List all available tools."""
    tools = await service.list_tools()
    return ToolResponse(tools=[ToolSchema(**tool) for tool in tools]) 