import asyncio
import time
import logging
import json
from datetime import datetime
from typing import Optional, Dict, List
from crewai import Agent as CrewAgent, Task as CrewTask, Crew, Process
from app.engine.models import EngineStatus, EngineConfig, StatusUpdate, ExecutionResult
from app.engine.schemas import CrewConfig, AgentConfig, TaskConfig
from app.engine.websocket import WebSocketManager
from app.engine.callbacks import CrewCallbackHandler
from app.services.tool_service import ToolService
from app.models.agent import Agent
from app.models.task import Task
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import os

logger = logging.getLogger(__name__)

class CrewRunner:
    """
    CrewAI execution engine that runs independently and provides status updates
    """
    def __init__(
        self,
        config: EngineConfig,
        websocket_manager: Optional[WebSocketManager] = None,
        crew_id: Optional[str] = None,
        tool_service: Optional[ToolService] = None,
    ):
        self.config = config
        self.ws_manager = websocket_manager
        self.crew_id = crew_id
        self.tool_service = tool_service
        self._status = EngineStatus.INITIALIZING
        self._start_time: Optional[datetime] = None
        self._end_time: Optional[datetime] = None

    async def _send_status(self, event: str, message: str, data: Optional[Dict] = None) -> None:
        """Send status update via WebSocket"""
        if self.ws_manager and self.crew_id:
            status_update = StatusUpdate(
                event=event,
                status=self._status,
                message=message,
                crew_id=self.crew_id,
                data=data,
                timestamp=datetime.utcnow()
            )
            await self.ws_manager.broadcast_status(status_update, self.crew_id)

    def _get_tools_for_agent(self, tool_names: List[str]) -> List:
        """Convert tool names to actual tool instances"""
        tools = []
        if not self.tool_service:
            logger.warning("No tool service provided, skipping tool initialization")
            return tools

        for tool_name in tool_names:
            try:
                tool_impl = self.tool_service.get_tool_implementation(tool_name)
                if tool_impl:
                    tools.append(tool_impl())
                else:
                    logger.warning(f"Tool {tool_name} not found in registry, skipping")
            except Exception as e:
                logger.error(f"Error creating tool {tool_name}: {str(e)}")
        return tools

    def _create_crewai_agent(self, config: AgentConfig) -> CrewAgent:
        """Create a CrewAI Agent from configuration"""
        # Convert tool names to actual tool instances
        tools = self._get_tools_for_agent(config.tools)
        
        return CrewAgent(
            name=config.name,
            role=config.role,
            goal=config.goal,
            backstory=config.backstory,
            memory=config.memory,
            verbose=config.verbose,
            allow_delegation=config.allow_delegation,
            tools=tools,  # Pass the actual tool instances
            max_iterations=config.max_iterations,
            max_rpm=config.max_rpm,
            async_mode=config.async_mode,
            human_input=config.human_input
        )

    def _create_crewai_task(self, config: TaskConfig, agents: Dict[str, CrewAgent]) -> CrewTask:
        """Create a CrewAI Task from configuration"""
        logger.info(f"Creating task with config: {json.dumps(config.model_dump(), indent=2)}")
        
        # Ensure agent exists
        if config.agent_name not in agents:
            raise ValueError(f"Agent {config.agent_name} not found for task")
            
        # Convert context to list if it's a string
        context = config.context if isinstance(config.context, list) else []
        
        # Create task configuration dictionary
        task_config = {
            "description": config.description,
            "expected_output": config.expected_output,
            "agent": agents[config.agent_name],
            "context": context,
            "async_mode": config.async_mode,
            "tools": config.tools,
            "max_iterations": config.max_iterations
        }
        
        # Create task with config dictionary
        task = CrewTask(
            config=task_config
        )
        
        logger.info(f"Created task for agent {config.agent_name}")
        return task

    async def execute(self, crew_config: CrewConfig) -> ExecutionResult:
        """
        Execute a crew based on the provided configuration
        
        Args:
            crew_config: Complete crew configuration
            
        Returns:
            ExecutionResult: The result of the execution
        """
        try:
            self._status = EngineStatus.INITIALIZING
            self._start_time = datetime.utcnow()
            
            # Initial status update
            await self._send_status(
                "execution_started",
                f"Starting execution of crew: {crew_config.name}",
                {
                    "crew_name": crew_config.name,
                    "start_time": self._start_time.isoformat()
                }
            )
            
            # Log the crew configuration
            logger.info("Crew configuration:")
            logger.info(json.dumps(crew_config.model_dump(), indent=2))
            
            # Create agents with status update
            await self._send_status(
                "creating_agents",
                "Creating agents...",
                {"agent_count": len(crew_config.agents)}
            )
            
            agents = {
                agent_config.name: self._create_crewai_agent(agent_config)
                for agent_config in crew_config.agents
            }
            
            # Create tasks with status update
            await self._send_status(
                "creating_tasks",
                "Creating tasks...",
                {"task_count": len(crew_config.tasks)}
            )
            
            tasks = []
            for task_config in crew_config.tasks:
                if task_config.agent_name not in agents:
                    logger.error(f"Agent {task_config.agent_name} not found for task")
                    continue
                    
                task = self._create_crewai_task(task_config, agents)
                tasks.append(task)

            if not tasks:
                raise ValueError("No tasks were created")

            # Initialize callback handler
            callback_handler = CrewCallbackHandler(
                websocket_manager=self.ws_manager,
                crew_id=self.crew_id,
                agent_id_map={agent.name: agent.name for agent in crew_config.agents},  # Use names as IDs
                task_id_map={task.description: task.description for task in crew_config.tasks}  # Use descriptions as IDs
            )

            # Create and configure crew
            await self._send_status(
                "creating_crew",
                "Creating crew...",
                {
                    "process_type": crew_config.process_type.value,
                    "agent_count": len(agents),
                    "task_count": len(tasks)
                }
            )

            process_type = Process.sequential if crew_config.process_type.value == "sequential" else Process.hierarchical
            
            crew = Crew(
                agents=list(agents.values()),
                tasks=tasks,
                process=process_type,
                memory=crew_config.memory,
                verbose=crew_config.verbose,
                max_rpm=crew_config.max_rpm,
                callbacks={
                    "on_tool_start": callback_handler.on_tool_start,
                    "on_tool_end": callback_handler.on_tool_end,
                    "on_task_start": callback_handler.on_task_start,
                    "on_task_end": callback_handler.on_task_end,
                    "on_chain_start": callback_handler.on_chain_start,
                    "on_chain_end": callback_handler.on_chain_end,
                    "on_human_input_start": callback_handler.on_human_input_start,
                    "on_human_input_end": callback_handler.on_human_input_end
                }
            )

            # Start execution with status update
            self._status = EngineStatus.RUNNING
            await self._send_status(
                "execution_running",
                "Starting crew tasks execution",
                {
                    "task_count": len(tasks),
                    "process_type": process_type.value
                }
            )

            # Execute with timeout
            try:
                logger.info("Starting crew kickoff...")
                
                # Run in a separate thread to not block
                def run_crew():
                    try:
                        return crew.kickoff(inputs=crew_config.inputs)
                    except Exception as e:
                        logger.error(f"Error in crew kickoff thread: {str(e)}")
                        raise
                
                result = await asyncio.wait_for(
                    asyncio.to_thread(run_crew),
                    timeout=self.config.execution_timeout
                )
                logger.info("Crew kickoff completed")
            except asyncio.TimeoutError:
                logger.error(f"Execution timed out after {self.config.execution_timeout} seconds")
                raise Exception(f"Execution timed out after {self.config.execution_timeout} seconds")
            except Exception as e:
                logger.error(f"Error during crew kickoff: {str(e)}")
                raise

            # Execution completed successfully
            self._status = EngineStatus.COMPLETED
            self._end_time = datetime.utcnow()
            
            execution_time = (self._end_time - self._start_time).total_seconds()
            logger.info(f"Execution completed in {execution_time} seconds")
            
            await self._send_status(
                "execution_completed",
                "Crew execution completed successfully",
                {"execution_time": execution_time}
            )

            # Convert CrewAI output to dictionary format
            output_dict = {
                "raw": str(result),  # Store raw output
                "tasks": {},  # Initialize tasks dict
                "inputs": crew_config.inputs or {}  # Store inputs used
            }
            
            # Try to extract task outputs if available
            try:
                for task in tasks:  # Use our task list instead of crew.tasks
                    task_id = task.description  # Use description as ID
                    output_dict["tasks"][task_id] = {
                        "description": task.description,
                        "agent": task.agent.name if hasattr(task.agent, "name") else "Unknown",
                        "output": task.output if hasattr(task, "output") else None,
                        "status": task.status if hasattr(task, "status") else None
                    }
            except Exception as e:
                logger.warning(f"Could not extract task outputs: {str(e)}")

            return ExecutionResult(
                status=self._status,
                output=output_dict,
                execution_time=execution_time,
                start_time=self._start_time,
                end_time=self._end_time,
                resource_usage={
                    "execution_time": execution_time
                }
            )

        except Exception as e:
            logger.error(f"Crew execution failed: {str(e)}", exc_info=True)
            self._status = EngineStatus.FAILED
            self._end_time = datetime.utcnow()
            
            error_message = str(e)
            await self._send_status(
                "execution_failed",
                f"Crew execution failed: {error_message}",
                {"error": error_message}
            )

            execution_time = (self._end_time - self._start_time).total_seconds()
            
            return ExecutionResult(
                status=self._status,
                output={},
                error=error_message,
                execution_time=execution_time,
                start_time=self._start_time,
                end_time=self._end_time,
                resource_usage={
                    "execution_time": execution_time
                }
            ) 

    async def get_agent_by_name(self, name: str) -> Optional[Dict]:
        """Get agent from database by name"""
        try:
            # Don't create a new transaction, just execute the query
            result = await self.db.execute(
                select(Agent).where(Agent.name == name)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error getting agent by name {name}: {str(e)}")
            return None

    async def get_task_by_description(self, description: str) -> Optional[Dict]:
        """Get task from database by description"""
        try:
            # Don't create a new transaction, just execute the query
            result = await self.db.execute(
                select(Task).where(Task.description == description)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error getting task by description {description}: {str(e)}")
            return None 