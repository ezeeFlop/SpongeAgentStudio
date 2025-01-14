from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from app.models.crew import Crew
from app.repositories.base_repository import BaseRepository

class CrewRepository(BaseRepository[Crew]):
    def __init__(self, db: AsyncSession):
        super().__init__(Crew, db)
    
    async def get(self, id: str) -> Crew:
        """Get a crew by ID with all related data"""
        result = await self.db.execute(
            select(self.model)
            .options(
                joinedload(Crew.agents),
                joinedload(Crew.tasks)
            )
            .filter(self.model.id == id)
        )
        return result.unique().scalar_one_or_none() 