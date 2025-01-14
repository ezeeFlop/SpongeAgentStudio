from pydantic import BaseModel
from typing import List

class ToolSchema(BaseModel):
    name: str
    description: str
    type: str  # "built_in" or "custom"
    
class ToolResponse(BaseModel):
    tools: List[ToolSchema] 