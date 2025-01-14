from typing import Set, Dict, Optional, ClassVar
import json
import asyncio
from fastapi import WebSocket
from app.engine.models import StatusUpdate
import logging

logger = logging.getLogger(__name__)

def adapt_message_for_frontend(status_update: StatusUpdate) -> Dict:
    """Adapt status update to frontend message format"""
    message_type_map = {
        'started': 'start_crew',
        'running': 'execution_update',
        'completed': 'execution_complete',
        'error': 'execution_error'
    }
    
    return {
        'type': message_type_map.get(status_update.status, 'execution_update'),
        'payload': {
            'status': status_update.status,
            'message': status_update.message,
            'data': status_update.data,
            'timestamp': status_update.timestamp.isoformat()
        }
    }

class WebSocketManager:
    """Manages WebSocket connections and broadcasts status updates"""
    
    _instance: ClassVar[Optional['WebSocketManager']] = None
    _lock: ClassVar[asyncio.Lock] = asyncio.Lock()

    def __new__(cls) -> 'WebSocketManager':
        if not cls._instance:
            cls._instance = super(WebSocketManager, cls).__new__(cls)
            cls._instance.active_connections = {}
            cls._instance._connection_lock = asyncio.Lock()
        return cls._instance

    def __init__(self):
        # Initialize only if not already initialized
        if not hasattr(self, 'active_connections'):
            self.active_connections: Dict[str, Set[WebSocket]] = {}
            self._connection_lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, crew_id: str):
        """Connect a new WebSocket client"""
        await websocket.accept()
        async with self._connection_lock:
            if crew_id not in self.active_connections:
                self.active_connections[crew_id] = set()
            self.active_connections[crew_id].add(websocket)
            logger.info(f"WebSocket client connected for crew {crew_id}")

    async def disconnect(self, websocket: WebSocket, crew_id: str):
        """Disconnect a WebSocket client"""
        async with self._connection_lock:
            if crew_id in self.active_connections:
                self.active_connections[crew_id].discard(websocket)
                if not self.active_connections[crew_id]:
                    del self.active_connections[crew_id]
                logger.info(f"WebSocket client disconnected from crew {crew_id}")

    async def broadcast_status(self, status_update: StatusUpdate, crew_id: str):
        """Broadcast a status update to all connected clients for a specific crew"""
        if crew_id not in self.active_connections:
            return

        # Adapt message for frontend
        message = adapt_message_for_frontend(status_update)
        
        # Get connections for this crew
        connections = self.active_connections[crew_id].copy()
        
        # Send to all connected clients
        for connection in connections:
            try:
                logger.info(f"Sending status update to crew {crew_id}: {message}")
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send message to client: {str(e)}")
                # If sending fails, disconnect the client
                await self.disconnect(connection, crew_id)

    async def send_direct_message(self, websocket: WebSocket, message: Dict):
        """Send a message to a specific client"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Failed to send direct message: {str(e)}")
            # If sending fails, get crew_id and disconnect
            for crew_id, connections in self.active_connections.items():
                if websocket in connections:
                    await self.disconnect(websocket, crew_id)
                    break

# Create a global instance
ws_manager = WebSocketManager() 