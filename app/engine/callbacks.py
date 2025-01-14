from typing import Dict, Any, Optional
from datetime import datetime
import logging
import asyncio
from crewai import Agent, Task
from app.engine.models import AgentState, ExecutionState, StatusUpdate, EngineStatus
from app.engine.websocket import WebSocketManager

logger = logging.getLogger(__name__)

class CrewCallbackHandler:
    """Callback handler for CrewAI execution events"""
    
    def __init__(self, websocket_manager: WebSocketManager, crew_id: str, agent_id_map: Dict[str, str], task_id_map: Dict[str, str]):
        self.ws_manager = websocket_manager
        self.crew_id = crew_id
        self.agent_id_map = agent_id_map  # name -> id mapping
        self.task_id_map = task_id_map    # description -> id mapping
        self.execution_state = ExecutionState()
        logger.info(f"Initialized CrewCallbackHandler for crew {crew_id}")
        logger.info(f"Agent ID mappings: {agent_id_map}")
        logger.info(f"Task ID mappings: {task_id_map}")
        
    def on_tool_start(self, agent: Agent, tool_name: str, input_args: Dict[str, Any]) -> None:
        """Called when an agent starts using a tool"""
        agent_id = self.agent_id_map.get(agent.name)
        logger.debug(f"Tool start - Agent: {agent.name} (ID: {agent_id}), Tool: {tool_name}")
        
        if agent_id:
            # Update agent state using agent name as key
            self.execution_state.agent_states[agent.name] = AgentState.EXECUTING.value
            
            # Set as current agent if not already set
            if not self.execution_state.current_agent_name:
                self.execution_state.current_agent_id = agent_id
                self.execution_state.current_agent_name = agent.name
            
            # Log the event
            logger.info(f"Agent {agent.name} using tool {tool_name}")
            
            asyncio.create_task(self._send_update(
                "tool_start",
                f"Agent {agent.name} using tool {tool_name}",
                {
                    "agent_id": agent_id,
                    "agent_name": agent.name,
                    "tool": tool_name,
                    "input": str(input_args)[:200]  # Include truncated input for context
                }
            ))
        else:
            logger.warning(f"No ID mapping found for agent {agent.name}")

    def on_tool_end(self, agent: Agent, tool_name: str, response: str) -> None:
        """Called when an agent finishes using a tool"""
        agent_id = self.agent_id_map.get(agent.name)
        if agent_id:
            # Keep the agent in EXECUTING state as they might use another tool
            self.execution_state.agent_states[agent.name] = AgentState.EXECUTING.value
            
            # Log the event
            logger.info(f"Agent {agent.name} finished using tool {tool_name}")
            
            asyncio.create_task(self._send_update(
                "tool_end",
                f"Agent {agent.name} finished using {tool_name}",
                {
                    "agent_id": agent_id,
                    "agent_name": agent.name,
                    "tool": tool_name,
                    "response": response[:200]  # Include truncated response
                }
            ))
        else:
            logger.warning(f"No ID mapping found for agent {agent.name}")

    def on_task_start(self, agent: Agent, task: Task) -> None:
        """Called when an agent starts a task"""
        agent_id = self.agent_id_map.get(agent.name)
        task_id = self.task_id_map.get(task.description)
        
        logger.debug(f"Task start - Agent: {agent.name} (ID: {agent_id}), Task: {task.description} (ID: {task_id})")
        
        if agent_id and task_id:
            self.execution_state.current_agent_id = agent_id
            self.execution_state.current_agent_name = agent.name
            self.execution_state.current_task_id = task_id
            self.execution_state.current_task_name = task.description
            self.execution_state.agent_states[agent.name] = AgentState.EXECUTING.value
            self.execution_state.task_progress[task_id] = 0.0
            
            # Log the event
            logger.info(f"Agent {agent.name} started task: {task.description}")
            
            asyncio.create_task(self._send_update(
                "task_start",
                f"Agent {agent.name} started task: {task.description}",
                {
                    "agent_id": agent_id,
                    "agent_name": agent.name,
                    "task_id": task_id,
                    "task_name": task.description
                }
            ))
        else:
            logger.warning(f"Missing ID mapping - Agent: {agent.name} -> {agent_id}, Task: {task.description} -> {task_id}")

    def on_task_end(self, agent: Agent, task: Task, output: str) -> None:
        """Called when an agent completes a task"""
        agent_id = self.agent_id_map.get(agent.name)
        task_id = self.task_id_map.get(task.description)
        
        if agent_id and task_id:
            self.execution_state.agent_states[agent.name] = AgentState.IDLE.value
            self.execution_state.task_progress[task_id] = 1.0
            
            # Log the event
            logger.info(f"Agent {agent.name} completed task: {task.description}")
            logger.info(f"Output: {output[:200]}...")
            
            asyncio.create_task(self._send_update(
                "task_end",
                f"Agent {agent.name} completed task: {task.description}",
                {"output": output[:500]}
            ))

    def on_chain_start(self, agent: Agent, task: Task) -> None:
        """Called when an agent starts its thinking process"""
        agent_id = self.agent_id_map.get(agent.name)
        if agent_id:
            self.execution_state.agent_states[agent.name] = AgentState.THINKING.value
            
            # Log the event
            logger.info(f"Agent {agent.name} is thinking about task: {task.description}")
            
            asyncio.create_task(self._send_update(
                "chain_start",
                f"Agent {agent.name} is thinking about task: {task.description}",
            ))

    def on_chain_end(self, agent: Agent, task: Task, response: str) -> None:
        """Called when an agent completes its thinking process"""
        agent_id = self.agent_id_map.get(agent.name)
        if agent_id:
            self.execution_state.agent_thoughts[agent.name] = response[:500]
            
            # Log the event
            logger.info(f"Agent {agent.name} finished thinking")
            logger.info(f"Thought process: {response[:200]}...")
            
            asyncio.create_task(self._send_update(
                "chain_end",
                f"Agent {agent.name} finished thinking",
                {"thought": response[:500]}
            ))

    def on_human_input_start(self, agent: Agent, task: Task) -> None:
        """Called when human input is requested"""
        agent_id = self.agent_id_map.get(agent.name)
        if agent_id:
            self.execution_state.agent_states[agent.name] = AgentState.WAITING.value
            
            # Log the event
            logger.info(f"Agent {agent.name} is waiting for human input on task: {task.description}")
            
            asyncio.create_task(self._send_update(
                "human_input_start",
                f"Agent {agent.name} is waiting for human input on task: {task.description}",
            ))

    def on_human_input_end(self, agent: Agent, task: Task, response: str) -> None:
        """Called when human input is received"""
        agent_id = self.agent_id_map.get(agent.name)
        if agent_id:
            # Log the event
            logger.info(f"Agent {agent.name} received human input")
            logger.info(f"Input: {response[:200]}...")
            
            asyncio.create_task(self._send_update(
                "human_input_end",
                f"Agent {agent.name} received human input",
                {"input": response[:500]}
            ))

    async def _send_update(self, event: str, message: str, data: Optional[Dict[str, Any]] = None):
        """Send a status update via WebSocket"""
        try:
            logger.debug(f"Sending WebSocket update - Event: {event}, Message: {message}")
            
            status_update = StatusUpdate(
                event=event,
                status=EngineStatus.RUNNING,
                message=message,
                crew_id=self.crew_id,
                data=data,
                execution_state=self.execution_state,
                timestamp=datetime.utcnow()
            )
            
            await self.ws_manager.broadcast_status(status_update, self.crew_id)
            logger.debug("WebSocket update sent successfully")
        except Exception as e:
            logger.error(f"Failed to send WebSocket update: {str(e)}", exc_info=True)
            # Don't raise the exception to avoid breaking the execution flow 