from sqlalchemy import Column, String, Boolean, Integer, DateTime, Table, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base

# Association table for crew-agent relationship
crew_agents = Table('crew_agents',
    Base.metadata,
    Column('crew_id', String, ForeignKey('crews.id'), primary_key=True),
    Column('agent_id', String, ForeignKey('agents.id'), primary_key=True)
)

class Crew(Base):
    __tablename__ = "crews"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=False)
    process_type = Column(String, server_default='sequential')
    memory = Column(Boolean, server_default='true')
    verbose = Column(Boolean, server_default='true')
    max_rpm = Column(Integer, server_default='10')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    agents = relationship("Agent", secondary=crew_agents, back_populates="crews")
    tasks = relationship("Task", back_populates="crew") 