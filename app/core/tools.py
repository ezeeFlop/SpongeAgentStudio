from typing import Dict, Type, List
from crewai_tools import (
    DirectoryReadTool,
    FileReadTool,
    SerperDevTool,
    WebsiteSearchTool,
    BaseTool
)

class ToolRegistry:
    """Registry for managing available CrewAI tools."""
    
    _built_in_tools: Dict[str, Dict[str, str]] = {
        "directory_read": {
            "name": "directory_read",
            "description": "Read the contents of a directory",
            "type": "built_in"
        },
        "file_read": {
            "name": "file_read",
            "description": "Read the contents of a file",
            "type": "built_in"
        },
        "serper_search": {
            "name": "serper_search",
            "description": "Search the web using Serper.dev API",
            "type": "built_in"
        },
        "website_search": {
            "name": "website_search",
            "description": "Search and extract information from websites",
            "type": "built_in"
        }
    }
    
    _tool_implementations: Dict[str, Type[BaseTool]] = {
        "directory_read": DirectoryReadTool,
        "file_read": FileReadTool,
        "serper_search": SerperDevTool,
        "website_search": WebsiteSearchTool,
    }
    
    _custom_tools: Dict[str, Dict[str, str]] = {}
    
    @classmethod
    def register_tool(cls, name: str, description: str, tool_class: Type[BaseTool]) -> None:
        """Register a new custom tool."""
        cls._custom_tools[name] = {
            "name": name,
            "description": description,
            "type": "custom"
        }
        cls._tool_implementations[name] = tool_class
    
    @classmethod
    def get_tool_implementation(cls, name: str) -> Type[BaseTool]:
        """Get a tool implementation by name."""
        return cls._tool_implementations.get(name)
    
    @classmethod
    def list_tools(cls) -> List[Dict[str, str]]:
        """List all available tools."""
        return list(cls._built_in_tools.values()) + list(cls._custom_tools.values()) 