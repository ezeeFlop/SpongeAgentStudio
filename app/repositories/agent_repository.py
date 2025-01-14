from sqlalchemy.ext.asyncio import AsyncSession
from app.models.agent import Agent
from app.repositories.base_repository import BaseRepository

class AgentRepository(BaseRepository[Agent]):
    def __init__(self, db: AsyncSession):
        super().__init__(Agent, db) 