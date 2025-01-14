from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime

class EngineStatus(str, Enum):
    """Status of the crew engine execution"""
    INITIALIZING = "initializing"
    RUNNING = "running"
    COMPLETED = "completed"
    ERROR = "error"

class EngineConfig(BaseModel):
    """Configuration for the crew engine"""
    max_concurrent_tasks: int = Field(default=5, description="Maximum number of concurrent tasks")
    execution_timeout: int = Field(default=3600, description="Execution timeout in seconds")
    retry_attempts: int = Field(default=3, description="Number of retry attempts for failed tasks")

class AgentState(str, Enum):
    IDLE = "idle"
    THINKING = "thinking"
    EXECUTING = "executing"
    DELEGATING = "delegating"
    WAITING = "waiting"

class ExecutionState(BaseModel):
    """Current state of crew execution"""
    current_agent_id: Optional[str] = None
    current_agent_name: Optional[str] = None
    current_task_id: Optional[str] = None
    current_task_name: Optional[str] = None
    agent_states: Dict[str, AgentState] = {}  # agent_id -> state
    task_progress: Dict[str, float] = {}  # task_id -> progress
    agent_thoughts: Dict[str, str] = {}  # agent_id -> thought

class StatusUpdate(BaseModel):
    """Status update message sent via WebSocket"""
    event: str
    status: EngineStatus
    message: str
    crew_id: str
    data: Optional[Dict[str, Any]] = None
    execution_state: Optional[ExecutionState] = None
    timestamp: datetime

class ExecutionResult(BaseModel):
    """Final result of crew execution"""
    status: EngineStatus
    output: Dict[str, Any]
    error: Optional[str] = None
    execution_time: float
    start_time: datetime
    end_time: Optional[datetime] = None 