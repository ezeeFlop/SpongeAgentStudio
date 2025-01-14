from crewai.tools import BaseTool
from pydantic import BaseModel, Field
from typing import Type
from app.services.tool_service import ToolRegistry

class CustomToolInput(BaseModel):
    """Input schema for custom tools."""
    query: str = Field(..., description="The input query for the tool")

class MyCustomTool(BaseTool):
    name: str = "my_custom_tool"
    description: str = "Description of what my tool does"
    args_schema: Type[BaseModel] = CustomToolInput

    def _run(self, query: str) -> str:
        # Implement your custom tool logic here
        return f"Custom tool result for: {query}"

# Register the custom tool:
ToolRegistry.register_tool(
    name="my_custom_tool",
    description="Description of what my tool does",
    tool_class=MyCustomTool
)