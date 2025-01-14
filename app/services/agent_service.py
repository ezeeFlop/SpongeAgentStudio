from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import SQLAlchemyError
from app.models.agent import Agent
from app.schemas.agent import AgentCreate, AgentUpdate
import uuid
from app.repositories.agent_repository import AgentRepository

class AgentService:
    def __init__(self, db: AsyncSession):
        self.repository = AgentRepository(db)
        self.db = db

    async def create_agent(self, agent: AgentCreate) -> Agent:
        try:
            async with self.db.begin():
                db_agent = Agent(id=str(uuid.uuid4()), **agent.model_dump())
                self.db.add(db_agent)
                await self.db.flush()
                return db_agent
        except SQLAlchemyError as e:
            await self.db.rollback()
            raise ValueError(f"Failed to create agent: {str(e)}")

    async def get_agent(self, agent_id: str) -> Optional[Agent]:
        try:
            result = await self.db.execute(
                select(Agent)
                .options(joinedload(Agent.crews))
                .filter(Agent.id == agent_id)
            )
            return result.unique().scalar_one_or_none()
        except SQLAlchemyError as e:
            raise ValueError(f"Failed to get agent: {str(e)}")

    async def list_agents(self, skip: int = 0, limit: int = 100) -> List[Agent]:
        try:
            result = await self.db.execute(
                select(Agent)
                .options(joinedload(Agent.crews))
                .offset(skip)
                .limit(limit)
            )
            return result.unique().scalars().all()
        except SQLAlchemyError as e:
            raise ValueError(f"Failed to list agents: {str(e)}")

    async def update_agent(self, agent_id: str, agent: AgentUpdate) -> Optional[Agent]:
        try:
            async with self.db.begin():
                db_agent = await self.get_agent(agent_id)
                if not db_agent:
                    return None

                update_data = agent.model_dump(exclude_unset=True)
                for field, value in update_data.items():
                    if field == "tools" and value is not None:
                        # Ensure tools is always a list of strings
                        db_agent.tools = [str(tool) for tool in value]
                    elif field != "crews":  # Handle relationships separately
                        setattr(db_agent, field, value)

                await self.db.flush()
                await self.db.refresh(db_agent)  # Refresh to get updated values
                return db_agent
        except SQLAlchemyError as e:
            await self.db.rollback()
            raise ValueError(f"Failed to update agent: {str(e)}")

    async def delete_agent(self, agent_id: str) -> bool:
        try:
            async with self.db.begin():
                db_agent = await self.get_agent(agent_id)
                if not db_agent:
                    return False

                await self.db.delete(db_agent)
                return True
        except SQLAlchemyError as e:
            await self.db.rollback()
            raise ValueError(f"Failed to delete agent: {str(e)}")

    async def list_agents_by_crew(self, crew_id: str) -> List[Agent]:
        """Get all agents for a specific crew"""
        result = await self.db.execute(
            select(Agent)
            .join(Agent.crews)
            .filter(Agent.crews.any(id=crew_id))
            .options(joinedload(Agent.crews))
        )
        return list(result.unique().scalars().all()) 