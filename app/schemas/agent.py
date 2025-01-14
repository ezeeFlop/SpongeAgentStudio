from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

class AgentBase(BaseModel):
    name: str = Field(..., description="Name of the agent")
    role: str = Field(..., description="Role of the agent")
    goal: str = Field(..., description="Goal of the agent")
    backstory: str = Field(..., description="Backstory of the agent")
    memory: bool = Field(True, description="Whether the agent has memory")
    verbose: bool = Field(True, description="Whether the agent is verbose")
    allow_delegation: bool = Field(False, description="Whether the agent can delegate tasks")
    tools: List[str] = Field(default_factory=list, description="List of tools available to the agent")
    max_iterations: int = Field(5, description="Maximum number of iterations")
    max_rpm: int = Field(10, description="Maximum requests per minute")
    async_mode: bool = Field(False, description="Whether the agent runs in async mode")
    expertise_level: str = Field(default='intermediate', description="Expertise level of the agent")
    process_type: str = Field(default='sequential', description="Process type of the agent")
    custom_tools: Optional[List[str]] = Field(default=None, description="Custom tools available to the agent")

    @field_validator('tools')
    def validate_tools(cls, v):
        if not isinstance(v, list):
            raise ValueError('tools must be a list')
        return [str(tool) for tool in v]  # Ensure all tools are strings

class AgentCreate(AgentBase):
    pass

class AgentUpdate(AgentBase):
    name: Optional[str] = None
    role: Optional[str] = None
    goal: Optional[str] = None
    backstory: Optional[str] = None
    memory: Optional[bool] = None
    verbose: Optional[bool] = None
    allow_delegation: Optional[bool] = None
    tools: Optional[List[str]] = None
    max_iterations: Optional[int] = None
    max_rpm: Optional[int] = None
    async_mode: Optional[bool] = None
    expertise_level: Optional[str] = None
    process_type: Optional[str] = None
    custom_tools: Optional[List[str]] = None

class Agent(AgentBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True 