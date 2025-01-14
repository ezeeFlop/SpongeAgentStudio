from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum
from app.schemas.agent import Agent

class ProcessType(str, Enum):
    SEQUENTIAL = "sequential"
    HIERARCHICAL = "hierarchical"

    @classmethod
    def from_str(cls, value: str) -> "ProcessType":
        try:
            return cls(value.lower())
        except ValueError:
            return cls.SEQUENTIAL

class CrewBase(BaseModel):
    name: str = Field(..., description="Name of the crew")
    description: str = Field(..., description="Description of the crew")
    process_type: ProcessType = Field(ProcessType.SEQUENTIAL, description="Type of process flow")
    memory: bool = Field(True, description="Whether the crew has memory")
    verbose: bool = Field(True, description="Whether the crew is verbose")
    max_rpm: int = Field(10, description="Maximum requests per minute")

class CrewCreate(CrewBase):
    pass

class CrewUpdate(CrewBase):
    name: Optional[str] = None
    description: Optional[str] = None
    process_type: Optional[ProcessType] = None
    memory: Optional[bool] = None
    verbose: Optional[bool] = None
    max_rpm: Optional[int] = None

class CrewNode(BaseModel):
    id: str
    position: dict
    type: str = "agent"
    data: dict

class CrewEdge(BaseModel):
    id: str
    source: str
    target: str

class Crew(CrewBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    agents: List[Agent] = Field(default_factory=list, description="List of agents in the crew. Tasks are accessed through their assigned agents.")

    model_config = ConfigDict(from_attributes=True) 