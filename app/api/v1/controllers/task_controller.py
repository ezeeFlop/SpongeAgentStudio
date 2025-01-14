from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.task_service import TaskService
from app.schemas.task import Task, TaskCreate, TaskUpdate, TaskStatus

router = APIRouter()

async def get_task_service(db: AsyncSession = Depends(get_db)) -> TaskService:
    return TaskService(db)

@router.post("", response_model=Task)
async def create_task(
    task: TaskCreate,
    service: TaskService = Depends(get_task_service)
):
    return await service.create_task(task)

@router.get("", response_model=List[Task])
async def list_tasks(
    skip: int = 0,
    limit: int = 100,
    service: TaskService = Depends(get_task_service)
):
    return await service.list_tasks(skip, limit)

@router.get("/{task_id}", response_model=Task)
async def get_task(
    task_id: str,
    service: TaskService = Depends(get_task_service)
):
    task = await service.get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.put("/{task_id}", response_model=Task)
async def update_task(
    task_id: str,
    task: TaskUpdate,
    service: TaskService = Depends(get_task_service)
):
    updated_task = await service.update_task(task_id, task)
    if updated_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return updated_task

@router.delete("/{task_id}")
async def delete_task(
    task_id: str,
    service: TaskService = Depends(get_task_service)
):
    success = await service.delete_task(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted successfully"}

@router.get("/agent/{agent_id}", response_model=List[Task])
async def list_agent_tasks(
    agent_id: str,
    service: TaskService = Depends(get_task_service)
):
    return await service.get_tasks_by_agent(agent_id)

@router.get("/crew/{crew_id}", response_model=List[Task])
async def list_crew_tasks(
    crew_id: str,
    service: TaskService = Depends(get_task_service)
):
    return await service.get_tasks_by_crew(crew_id)

@router.put("/{task_id}/status", response_model=Task)
async def update_task_status(
    task_id: str,
    status: TaskStatus,
    service: TaskService = Depends(get_task_service)
):
    task = await service.update_task_status(task_id, status)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.put("/{task_id}/output", response_model=Task)
async def update_task_output(
    task_id: str,
    output: str,
    output_file: str = None,
    service: TaskService = Depends(get_task_service)
):
    task = await service.update_task_output(task_id, output, output_file)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task 