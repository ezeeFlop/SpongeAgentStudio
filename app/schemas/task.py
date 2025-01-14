from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum

class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

class TaskBase(BaseModel):
    name: str = Field(..., description="Name of the task")
    description: str = Field(..., description="Description of the task")
    expected_output: str = Field(..., description="Expected output format or description")
    context: List[str] = Field(default_factory=list, description="List of context items for the task")
    tools: List[str] = Field(default_factory=list, description="List of tools required for the task")
    dependencies: List[str] = Field(default_factory=list, description="List of task IDs that this task depends on")
    agent_id: str = Field(..., description="ID of the assigned agent - required as tasks must be assigned to an agent")
    crew_id: Optional[str] = Field(None, description="ID of the crew - will be set when the task is added to a crew")
    async_mode: bool = Field(False, description="Whether the task runs in async mode")
    max_iterations: int = Field(10, description="Maximum number of iterations for the task")
    max_rpm: int = Field(10, description="Maximum requests per minute for the task")

class TaskCreate(TaskBase):
    pass

class TaskUpdate(TaskBase):
    name: Optional[str] = None
    description: Optional[str] = None
    expected_output: Optional[str] = None
    context: Optional[List[str]] = None
    tools: Optional[List[str]] = None
    dependencies: Optional[List[str]] = None
    agent_id: Optional[str] = None
    crew_id: Optional[str] = None
    async_mode: Optional[bool] = None
    max_iterations: Optional[int] = None
    max_rpm: Optional[int] = None
    status: Optional[TaskStatus] = None

class Task(TaskBase):
    id: str
    status: TaskStatus = TaskStatus.PENDING
    output: Optional[str] = None
    output_file: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True) 