from typing import List, Optional, Dict, Set, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import SQLAlchemyError
from app.models.crew import Crew
from app.models.agent import Agent
from app.models.task import Task
from app.schemas.crew import CrewCreate, CrewUpdate
from app.engine import CrewRunner, EngineConfig, WebSocketManager
from app.engine.schemas import create_crew_config_from_json, StatusUpdate
from app.services.tool_service import ToolService
from app.repositories.crew_repository import CrewRepository
from app.services.agent_service import AgentService
from app.services.task_service import TaskService
from app.engine.websocket import ws_manager
import uuid
import logging

logger = logging.getLogger(__name__)

class CrewService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.engine_config = EngineConfig()  # Use defaults
        self.tool_service = ToolService(db)
        self.repository = CrewRepository(db)
        self.agent_service = AgentService(db)
        self.task_service = TaskService(db)

    def _convert_db_models_to_json(self, crew: Crew, agents: List[Agent], tasks: List[Task]) -> Dict:
        """
        Convert database models to JSON format for crew configuration.
        Handles missing fields with appropriate defaults.
        """
        # Create agent name lookup
        agent_lookup = {agent.id: agent for agent in agents}
        
        # Helper function to safely get attribute with default
        def get_attr(obj, attr: str, default: Any) -> Any:
            return getattr(obj, attr, default)
        
        # Convert to JSON structure
        return {
            "id": str(crew.id),
            "name": crew.name,
            "description": get_attr(crew, "description", ""),
            "process_type": get_attr(crew, "process_type", "sequential"),
            "memory": get_attr(crew, "memory", True),
            "verbose": get_attr(crew, "verbose", True),
            "max_rpm": get_attr(crew, "max_rpm", 10),
            "agents": [
                {
                    "name": agent.name,
                    "role": agent.role,
                    "goal": agent.goal,
                    "backstory": agent.backstory,
                    "memory": get_attr(agent, "memory", True),
                    "verbose": get_attr(agent, "verbose", True),
                    "allow_delegation": get_attr(agent, "allow_delegation", False),
                    "tools": get_attr(agent, "tools", []),
                    "max_iterations": get_attr(agent, "max_iterations", 5),
                    "max_rpm": get_attr(agent, "max_rpm", 10),
                    "async_mode": get_attr(agent, "async_mode", False),
                    "human_input": get_attr(agent, "human_input", False)  # Default to False if not present
                }
                for agent in agents
            ],
            "tasks": [
                {
                    "description": task.description,
                    "expected_output": get_attr(task, "expected_output", ""),
                    "agent_name": agent_lookup[task.agent_id].name if task.agent_id in agent_lookup else None,
                    "context": (
                        task.context if isinstance(task.context, list)
                        else [task.context] if task.context
                        else []
                    ),
                    "tools": get_attr(task, "tools", []),
                    "output_file": get_attr(task, "output_file", None),
                    "async_mode": get_attr(task, "async_mode", False),
                    "max_iterations": get_attr(task, "max_iterations", 5),
                    "human_input": get_attr(task, "human_input", False)  # Default to False if not present
                }
                for task in tasks
                if task.agent_id in agent_lookup  # Only include tasks with valid agents
            ]
        }

    async def execute_crew(self, crew_id: str, inputs: Optional[Dict[str, str]] = None) -> Dict:
        """
        Execute a crew using the CrewAI engine
        
        Args:
            crew_id: ID of the crew to execute
            inputs: Optional dictionary of input variables
            
        Returns:
            Dict containing execution results
        """
        try:
            # Get crew with all related data
            crew = await self.get_crew(crew_id)
            if not crew:
                raise ValueError(f"Crew {crew_id} not found")

            # Log crew details
            logger.info(f"Executing crew: {crew.name} ({crew.id})")
            logger.info(f"Process type: {crew.process_type}")
            logger.info(f"Number of agents: {len(crew.agents)}")
            logger.info(f"Inputs: {inputs}")

            # Notify clients that execution has started
            await ws_manager.broadcast_status(
                StatusUpdate(
                    status="started",
                    message=f"Starting execution of crew {crew.name}",
                    data={"crew_id": crew_id}
                ),
                crew_id
            )

            # Get all agents and their tasks for this crew
            agents = crew.agents
            logger.info(f"Agents loaded: {[f'{a.name} ({a.role})' for a in agents]}")

            # Get tasks through agent relationships
            tasks = []
            for agent in agents:
                agent_tasks = await self.db.execute(
                    select(Task).filter(Task.agent_id == agent.id)
                )
                agent_tasks = agent_tasks.scalars().all()
                tasks.extend(agent_tasks)
                logger.info(f"Agent {agent.name} has {len(agent_tasks)} tasks")
                for task in agent_tasks:
                    logger.info(f"Task: {task.name} (agent: {agent.name})")

            # Convert database models to JSON configuration
            json_config = self._convert_db_models_to_json(crew, agents, tasks)
            
            # Add inputs if provided
            if inputs:
                json_config["inputs"] = inputs

            # Create crew configuration
            crew_config = create_crew_config_from_json(json_config)

            # Initialize runner with crew_id and tool service
            runner = CrewRunner(
                config=self.engine_config,
                websocket_manager=ws_manager,
                crew_id=crew_id,
                tool_service=self.tool_service
            )

            # Execute crew
            result = await runner.execute(crew_config)

            # Update task statuses and outputs based on result
            if result.status == "completed":
                for task in tasks:
                    task_desc = task.description
                    if task_desc in result.output["tasks"]:
                        task_output = result.output["tasks"][task_desc]
                        await self.update_task_output(
                            task.id,
                            output=task_output.get("output"),
                            output_file=task_output.get("output_file")
                        )

            # Notify clients of completion
            await ws_manager.broadcast_status(
                StatusUpdate(
                    status="completed",
                    message=f"Crew {crew.name} execution completed",
                    data={"crew_id": crew_id, "result": result.model_dump()}
                ),
                crew_id
            )

            return result.model_dump()

        except Exception as e:
            # Notify clients of error
            await ws_manager.broadcast_status(
                StatusUpdate(
                    status="error",
                    message=str(e),
                    data={"crew_id": crew_id}
                ),
                crew_id
            )
            raise ValueError(f"Failed to execute crew: {str(e)}")

    async def create_crew(self, crew: CrewCreate) -> Crew:
        try:
            async with self.db.begin():
                db_crew = Crew(id=str(uuid.uuid4()), **crew.model_dump())
                self.db.add(db_crew)
                await self.db.flush()
                # Refresh to load relationships
                await self.db.refresh(db_crew, ['agents', 'tasks'])
                return db_crew
        except SQLAlchemyError as e:
            await self.db.rollback()
            raise ValueError(f"Failed to create crew: {str(e)}")

    async def get_crew(self, crew_id: str) -> Optional[Crew]:
        """Get a crew by ID with all related data"""
        try:
            # Use explicit joins to ensure all relationships are loaded
            result = await self.db.execute(
                select(Crew)
                .options(
                    joinedload(Crew.agents),
                    joinedload(Crew.tasks).joinedload(Task.agent)  # Load task's agent relationship
                )
                .filter(Crew.id == crew_id)
            )
            crew = result.unique().scalar_one_or_none()
            
            if crew:
                logger.info(f"Loaded crew {crew_id} with {len(crew.agents)} agents and {len(crew.tasks)} tasks")
                logger.info(f"Agents: {[f'{a.id}:{a.name}' for a in crew.agents]}")
                
                for task in crew.tasks:
                    logger.info(
                        f"Task details - ID: {task.id}, "
                        f"Name: {task.name}, "
                        f"Agent ID: {task.agent_id}, "
                        f"Agent: {task.agent.name if task.agent else 'None'}, "
                        f"Description: {task.description[:50]}..."
                    )
            
            return crew
        except SQLAlchemyError as e:
            logger.error(f"Database error getting crew: {str(e)}")
            raise ValueError(f"Failed to get crew: {str(e)}")
        except Exception as e:
            logger.error(f"Error getting crew: {str(e)}")
            raise ValueError(f"Failed to get crew: {str(e)}")

    async def list_crews(self, skip: int = 0, limit: int = 100) -> List[Crew]:
        try:
            result = await self.db.execute(
                select(Crew)
                .options(
                    joinedload(Crew.agents),
                    joinedload(Crew.tasks)
                )
                .offset(skip)
                .limit(limit)
            )
            return result.unique().scalars().all()
        except SQLAlchemyError as e:
            raise ValueError(f"Failed to list crews: {str(e)}")

    async def update_crew(self, crew_id: str, crew: CrewUpdate) -> Optional[Crew]:
        try:
            async with self.db.begin():
                # First get the crew with all relationships loaded
                result = await self.db.execute(
                    select(Crew)
                    .options(
                        joinedload(Crew.agents),
                        joinedload(Crew.tasks)
                    )
                    .filter(Crew.id == crew_id)
                )
                db_crew = result.unique().scalar_one_or_none()
                
                if not db_crew:
                    return None

                # Update fields
                update_data = crew.model_dump(exclude_unset=True)
                for field, value in update_data.items():
                    if field != "agents" and field != "tasks":  # Handle relationships separately
                        setattr(db_crew, field, value)
                
                await self.db.flush()
                # Explicitly refresh all relationships
                await self.db.refresh(db_crew, ['agents', 'tasks'])
                return db_crew

        except SQLAlchemyError as e:
            await self.db.rollback()
            raise ValueError(f"Failed to update crew: {str(e)}")

    async def delete_crew(self, crew_id: str) -> bool:
        try:
            async with self.db.begin():
                db_crew = await self.get_crew(crew_id)
                if not db_crew:
                    return False

                await self.db.delete(db_crew)
                return True
        except SQLAlchemyError as e:
            await self.db.rollback()
            raise ValueError(f"Failed to delete crew: {str(e)}")

    async def add_agent_to_crew(self, crew_id: str, agent_id: str) -> Optional[Crew]:
        try:
            async with self.db.begin():
                db_crew = await self.get_crew(crew_id)
                result = await self.db.execute(
                    select(Agent).filter(Agent.id == agent_id)
                )
                db_agent = result.scalar_one_or_none()

                if not db_crew or not db_agent:
                    return None

                if db_agent not in db_crew.agents:
                    db_crew.agents.append(db_agent)
                    await self.db.flush()
                
                return db_crew
        except SQLAlchemyError as e:
            await self.db.rollback()
            raise ValueError(f"Failed to add agent to crew: {str(e)}")

    async def remove_agent_from_crew(self, crew_id: str, agent_id: str) -> Optional[Crew]:
        try:
            async with self.db.begin():
                db_crew = await self.get_crew(crew_id)
                result = await self.db.execute(
                    select(Agent).filter(Agent.id == agent_id)
                )
                db_agent = result.scalar_one_or_none()

                if not db_crew or not db_agent:
                    return None

                if db_agent in db_crew.agents:
                    db_crew.agents.remove(db_agent)
                    await self.db.flush()
                
                return db_crew
        except SQLAlchemyError as e:
            await self.db.rollback()
            raise ValueError(f"Failed to remove agent from crew: {str(e)}") 

    async def get_crew_variables(self, crew_id: str) -> Set[str]:
        """Get all required variables for a crew's execution"""
        # Get the crew and its associated agents and tasks
        crew = await self.repository.get(crew_id)
        logger.info(f"get_crew_variables Crew: {crew}")
        if not crew:
            return set()
            
        agents = await self.agent_service.list_agents_by_crew(crew_id)
        tasks = await self.task_service.list_tasks_by_crew(crew_id)
        logger.info(f"get_crew_variables Agents: {agents}")
        logger.info(f"get_crew_variables Tasks: {tasks}")
        
        # Validate that crew has both agents and tasks
        if not agents or not tasks:
            logger.warning(f"Crew {crew_id} has no agents ({len(agents)}) or tasks ({len(tasks)})")
            return set()
        
        # Convert to JSON format and create crew config
        json_config = self._convert_db_models_to_json(crew, agents, tasks)
        crew_config = create_crew_config_from_json(json_config)
        logger.info(f"get_crew_variables Crew config: {crew_config.model_dump_json(indent=2)}")
        
        return crew_config.get_required_variables() 