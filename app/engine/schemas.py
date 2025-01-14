from typing import Dict, List, Optional, Union, Literal, Set, Any
from pydantic import BaseModel, Field
from enum import Enum
import logging
import re
from datetime import datetime
import json
import uuid

logger = logging.getLogger(__name__)

class StatusUpdate(BaseModel):
    """Model for WebSocket status updates"""
    status: str = Field(..., description="Current status (started, running, completed, error)")
    message: str = Field(..., description="Status message")
    data: Dict[str, Any] = Field(default_factory=dict, description="Additional data")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Timestamp of the update")

def extract_variables(text: str) -> Set[str]:
    """Extract variables in curly braces from text"""
    if not text:
        return set()
    # Find all matches of {variable_name}
    matches = re.findall(r'\{([^}]+)\}', text)
    return set(matches)

class AgentConfig(BaseModel):
    """Agent configuration matching CrewAI's Agent parameters"""
    name: str
    role: str
    goal: str
    backstory: str
    memory: bool = True
    verbose: bool = True
    allow_delegation: bool = False
    tools: List[str] = []
    max_iterations: int = 5
    max_rpm: int = 10
    async_mode: bool = False
    human_input: bool = False

class TaskConfig(BaseModel):
    """Task configuration matching CrewAI's Task parameters"""
    description: str
    expected_output: str
    agent_name: str  # Reference to agent by name
    human_input: bool = False
    output_file: Optional[str] = None
    context: List[str] = Field(default_factory=list, description="List of context items for the task")
    tools: List[str] = Field(default_factory=list, description="List of tools required for the task")
    async_mode: bool = False
    max_iterations: int = 5

class ProcessType(str, Enum):
    """CrewAI process types"""
    SEQUENTIAL = "sequential"
    HIERARCHICAL = "hierarchical"

    @classmethod
    def from_str(cls, value: str) -> "ProcessType":
        """Convert string to ProcessType, defaulting to SEQUENTIAL if invalid"""
        try:
            return cls(value.lower())
        except ValueError:
            return cls.SEQUENTIAL

class CrewConfig(BaseModel):
    """Complete crew configuration for CrewAI"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    process_type: ProcessType = ProcessType.SEQUENTIAL
    agents: List[AgentConfig]
    tasks: List[TaskConfig]
    memory: bool = True
    verbose: bool = True
    max_rpm: int = 10
    inputs: Optional[Dict[str, str]] = None

    def get_required_variables(self) -> Set[str]:
        """Get all required variables from agents and tasks"""
        variables = set()
        
        # Extract from agents
        for agent in self.agents:
            variables.update(extract_variables(agent.goal))
            variables.update(extract_variables(agent.backstory))
            variables.update(extract_variables(agent.role))
        
        # Extract from tasks
        for task in self.tasks:
            variables.update(extract_variables(task.description))
            variables.update(extract_variables(task.expected_output))
        
        return variables

def create_crew_config_from_json(json_data: Dict) -> CrewConfig:
    """
    Create a CrewConfig directly from a JSON dictionary
    
    Args:
        json_data: Dictionary containing crew configuration
        
    Returns:
        CrewConfig: Configuration ready for CrewAI
        
    Example JSON format:
    {
        "id": "unique-id",  # Optional, will be generated if not provided
        "name": "Crew Name",
        "description": "Crew Description",
        "process_type": "sequential",
        "agents": [
            {
                "name": "agent1",
                "role": "role1",
                "goal": "goal1",
                "backstory": "backstory1",
                "tools": ["tool1", "tool2"]
            }
        ],
        "tasks": [
            {
                "description": "task1",
                "expected_output": "output1",
                "agent_name": "agent1",
                "context": ["context1"],
                "tools": ["tool1"]
            }
        ],
        "inputs": {
            "var1": "value1"
        }
    }
    """
    logger.info("Creating crew configuration from JSON")
    logger.info(f"Input data: {json.dumps(json_data, indent=2)}")
    
    # Convert process type
    process_type = ProcessType.from_str(json_data.get("process_type", "sequential"))
    
    # Convert agents
    agent_configs = [
        AgentConfig(
            name=agent["name"],
            role=agent["role"],
            goal=agent["goal"],
            backstory=agent["backstory"],
            tools=agent.get("tools", []),
            memory=agent.get("memory", True),
            verbose=agent.get("verbose", True),
            allow_delegation=agent.get("allow_delegation", False),
            max_iterations=agent.get("max_iterations", 5),
            max_rpm=agent.get("max_rpm", 10),
            async_mode=agent.get("async_mode", False),
            human_input=agent.get("human_input", False)
        )
        for agent in json_data.get("agents", [])
    ]
    
    # Convert tasks
    task_configs = [
        TaskConfig(
            description=task["description"],
            expected_output=task["expected_output"],
            agent_name=task["agent_name"],
            context=task.get("context", []),
            tools=task.get("tools", []),
            output_file=task.get("output_file"),
            async_mode=task.get("async_mode", False),
            max_iterations=task.get("max_iterations", 5),
            human_input=task.get("human_input", False)
        )
        for task in json_data.get("tasks", [])
    ]
    
    if not agent_configs:
        raise ValueError("No agents found in JSON configuration")
    if not task_configs:
        raise ValueError("No tasks found in JSON configuration")
    
    # Create the full crew config
    config = CrewConfig(
        id=json_data.get("id", str(uuid.uuid4())),
        name=json_data["name"],
        description=json_data.get("description", ""),
        process_type=process_type,
        agents=agent_configs,
        tasks=task_configs,
        memory=json_data.get("memory", True),
        verbose=json_data.get("verbose", True),
        max_rpm=json_data.get("max_rpm", 10),
        inputs=json_data.get("inputs")
    )
    
    logger.info("Crew configuration created successfully from JSON")
    return config 