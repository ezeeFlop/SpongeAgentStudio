from fastapi import APIRouter
from app.api.v1.controllers.agent_controller import router as agent_router
from app.api.v1.controllers.crew_controller import router as crew_router
from app.api.v1.controllers.task_controller import router as task_router
from app.api.v1.controllers.tool_controller import router as tool_router

router = APIRouter()

router.include_router(agent_router, prefix="/agents", tags=["agents"])
router.include_router(crew_router, prefix="/crews", tags=["crews"])
router.include_router(task_router, prefix="/tasks", tags=["tasks"]) 
router.include_router(tool_router, prefix="/tools", tags=["tools"]) 