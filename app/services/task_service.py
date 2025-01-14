from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import SQLAlchemyError
from app.models.task import Task
from app.models.agent import Agent
from app.models.crew import Crew
from app.schemas.task import TaskCreate, TaskUpdate, TaskStatus
import uuid

class TaskService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_task(self, task: TaskCreate) -> Task:
        try:
            async with self.db.begin():
                db_task = Task(id=str(uuid.uuid4()), status=TaskStatus.PENDING, **task.model_dump())
                self.db.add(db_task)
                await self.db.flush()
                return db_task
        except SQLAlchemyError as e:
            await self.db.rollback()
            raise ValueError(f"Failed to create task: {str(e)}")

    async def get_task(self, task_id: str) -> Optional[Task]:
        try:
            result = await self.db.execute(
                select(Task)
                .options(joinedload(Task.agent), joinedload(Task.crew))
                .filter(Task.id == task_id)
            )
            return result.unique().scalar_one_or_none()
        except SQLAlchemyError as e:
            raise ValueError(f"Failed to get task: {str(e)}")

    async def list_tasks(self, skip: int = 0, limit: int = 100) -> List[Task]:
        try:
            result = await self.db.execute(
                select(Task)
                .options(joinedload(Task.agent), joinedload(Task.crew))
                .offset(skip)
                .limit(limit)
            )
            return result.unique().scalars().all()
        except SQLAlchemyError as e:
            raise ValueError(f"Failed to list tasks: {str(e)}")

    async def get_tasks_by_agent(self, agent_id: str) -> List[Task]:
        try:
            result = await self.db.execute(
                select(Task)
                .options(joinedload(Task.agent), joinedload(Task.crew))
                .filter(Task.agent_id == agent_id)
            )
            return result.unique().scalars().all()
        except SQLAlchemyError as e:
            raise ValueError(f"Failed to get tasks by agent: {str(e)}")

    async def get_tasks_by_crew(self, crew_id: str) -> List[Task]:
        try:
            result = await self.db.execute(
                select(Task)
                .options(joinedload(Task.agent), joinedload(Task.crew))
                .filter(Task.crew_id == crew_id)
            )
            return result.unique().scalars().all()
        except SQLAlchemyError as e:
            raise ValueError(f"Failed to get tasks by crew: {str(e)}")

    async def update_task(self, task_id: str, task: TaskUpdate) -> Optional[Task]:
        try:
            async with self.db.begin():
                db_task = await self.get_task(task_id)
                if not db_task:
                    return None

                update_data = task.model_dump(exclude_unset=True)
                for field, value in update_data.items():
                    if field not in ["agent", "crew"]:  # Handle relationships separately
                        setattr(db_task, field, value)

                await self.db.flush()
                return db_task
        except SQLAlchemyError as e:
            await self.db.rollback()
            raise ValueError(f"Failed to update task: {str(e)}")

    async def delete_task(self, task_id: str) -> bool:
        try:
            async with self.db.begin():
                db_task = await self.get_task(task_id)
                if not db_task:
                    return False

                await self.db.delete(db_task)
                return True
        except SQLAlchemyError as e:
            await self.db.rollback()
            raise ValueError(f"Failed to delete task: {str(e)}")

    async def update_task_status(self, task_id: str, status: TaskStatus) -> Optional[Task]:
        try:
            async with self.db.begin():
                db_task = await self.get_task(task_id)
                if not db_task:
                    return None

                db_task.status = status
                await self.db.flush()
                return db_task
        except SQLAlchemyError as e:
            await self.db.rollback()
            raise ValueError(f"Failed to update task status: {str(e)}")

    async def update_task_output(
        self,
        task_id: str,
        output: str,
        output_file: Optional[str] = None
    ) -> Optional[Task]:
        try:
            async with self.db.begin():
                db_task = await self.get_task(task_id)
                if not db_task:
                    return None

                db_task.output = output
                if output_file:
                    db_task.output_file = output_file
                db_task.status = TaskStatus.COMPLETED

                await self.db.flush()
                return db_task
        except SQLAlchemyError as e:
            await self.db.rollback()
            raise ValueError(f"Failed to update task output: {str(e)}")

    async def list_tasks_by_crew(self, crew_id: str) -> List[Task]:
        """Get all tasks for a specific crew through its agents"""
        result = await self.db.execute(
            select(Task)
            .join(Task.agent)
            .join(Agent.crews)
            .filter(Crew.id == crew_id)
            .options(joinedload(Task.agent))
        )
        return list(result.unique().scalars().all()) 