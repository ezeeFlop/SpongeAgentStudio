from sqlalchemy import Column, String, Boolean, Text, DateTime, ForeignKey, ARRAY, func, Integer
from sqlalchemy.orm import relationship
from app.database import Base

class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    expected_output = Column(Text, nullable=False)
    context = Column(ARRAY(String), server_default='{}')
    tools = Column(ARRAY(String), server_default='{}')
    dependencies = Column(ARRAY(String), server_default='{}')
    agent_id = Column(String, ForeignKey('agents.id'))
    crew_id = Column(String, ForeignKey('crews.id'))
    status = Column(String, server_default='pending')
    output = Column(Text)
    output_file = Column(String)
    async_mode = Column(Boolean, server_default='false')
    max_iterations = Column(Integer, server_default='10')
    max_rpm = Column(Integer, server_default='10')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), server_onupdate=func.now())

    # Relationships
    agent = relationship("Agent", back_populates="tasks")
    crew = relationship("Crew", back_populates="tasks") 