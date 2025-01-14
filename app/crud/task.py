from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate, TaskStatus
import uuid

async def get_task(db: AsyncSession, task_id: str) -> Optional[Task]:
    result = await db.execute(select(Task).filter(Task.id == task_id))
    return result.scalar_one_or_none()

async def get_tasks(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Task]:
    result = await db.execute(select(Task).offset(skip).limit(limit))
    return result.scalars().all()

async def get_tasks_by_agent(db: AsyncSession, agent_id: str) -> List[Task]:
    result = await db.execute(select(Task).filter(Task.agent_id == agent_id))
    return result.scalars().all()

async def get_tasks_by_crew(db: AsyncSession, crew_id: str) -> List[Task]:
    result = await db.execute(select(Task).filter(Task.crew_id == crew_id))
    return result.scalars().all()

async def create_task(db: AsyncSession, task: TaskCreate) -> Task:
    db_task = Task(id=str(uuid.uuid4()), **task.model_dump())
    db.add(db_task)
    await db.commit()
    await db.refresh(db_task)
    return db_task

async def update_task(db: AsyncSession, task_id: str, task: TaskUpdate) -> Optional[Task]:
    result = await db.execute(
        select(Task).filter(Task.id == task_id)
    )
    db_task = result.scalar_one_or_none()
    if not db_task:
        return None
    
    update_data = task.model_dump(exclude_unset=True)
    
    # Handle special fields first
    if "dependencies" in update_data:
        db_task.dependencies = update_data.pop("dependencies", [])
    
    # Update remaining fields
    for field, value in update_data.items():
        setattr(db_task, field, value)
    
    try:
        await db.commit()
        await db.refresh(db_task)
        return db_task
    except Exception as e:
        await db.rollback()
        raise e

async def delete_task(db: AsyncSession, task_id: str) -> bool:
    db_task = await get_task(db, task_id)
    if not db_task:
        return False
    
    await db.delete(db_task)
    await db.commit()
    return True

async def update_task_status(db: AsyncSession, task_id: str, status: TaskStatus) -> Optional[Task]:
    result = await db.execute(
        select(Task).filter(Task.id == task_id)
    )
    db_task = result.scalar_one_or_none()
    if not db_task:
        return None
    
    db_task.status = status
    await db.commit()
    await db.refresh(db_task)
    return db_task

async def update_task_output(db: AsyncSession, task_id: str, output: str, output_file: Optional[str] = None) -> Optional[Task]:
    result = await db.execute(
        select(Task).filter(Task.id == task_id)
    )
    db_task = result.scalar_one_or_none()
    if not db_task:
        return None
    
    db_task.output = output
    if output_file:
        db_task.output_file = output_file
    db_task.status = TaskStatus.COMPLETED
    
    await db.commit()
    await db.refresh(db_task)
    return db_task 