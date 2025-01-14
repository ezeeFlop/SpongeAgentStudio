from sqlalchemy import Column, String, Boolean, Integer, DateTime, ARRAY, JSON, func
from sqlalchemy.orm import relationship
from app.database import Base

class Agent(Base):
    __tablename__ = "agents"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    goal = Column(String, nullable=False)
    backstory = Column(String, nullable=False)
    memory = Column(Boolean, server_default='true')
    verbose = Column(Boolean, server_default='true')
    allow_delegation = Column(Boolean, server_default='false')
    tools = Column(ARRAY(String), server_default='{}')
    max_iterations = Column(Integer, server_default='5')
    max_rpm = Column(Integer, server_default='10')
    async_mode = Column(Boolean, server_default='false')
    expertise_level = Column(String, nullable=False, server_default='intermediate')
    process_type = Column(String, nullable=False, server_default='sequential')
    custom_tools = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), server_onupdate=func.now())

    # Relationships
    crews = relationship("Crew", secondary="crew_agents", back_populates="agents")
    tasks = relationship("Task", back_populates="agent") 