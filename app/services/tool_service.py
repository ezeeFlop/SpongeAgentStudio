from typing import List, Dict, Type
from sqlalchemy.ext.asyncio import AsyncSession
from crewai_tools import (
    BrowserbaseLoadTool,
    CodeDocsSearchTool,
    CodeInterpreterTool,
    ComposioTool,
    CSVSearchTool,
    DallETool,
    DirectorySearchTool,
    DirectoryReadTool,
    DOCXSearchTool,
    EXASearchTool,
    FileReadTool,
    FirecrawlSearchTool,
    FirecrawlCrawlWebsiteTool,
    FirecrawlScrapeWebsiteTool,
    GithubSearchTool,
    SerperDevTool,
    TXTSearchTool,
    JSONSearchTool,
    MDXSearchTool,
    PDFSearchTool,
    PGSearchTool,
    VisionTool,
    RagTool,
    ScrapeElementFromWebsiteTool,
    ScrapeWebsiteTool,
    WebsiteSearchTool,
    XMLSearchTool,
    YoutubeChannelSearchTool,
    YoutubeVideoSearchTool
)
from crewai.tools import BaseTool
from pydantic import BaseModel, Field

class CustomToolInput(BaseModel):
    """Input schema for custom tools."""
    query: str = Field(..., description="The input query for the tool")

class CustomTool(BaseTool):
    """Template for creating custom tools."""
    name: str = "custom_tool_template"
    description: str = "Template for creating custom tools"
    args_schema: Type[BaseModel] = CustomToolInput

    def _run(self, query: str) -> str:
        """Execute the tool's logic."""
        # Implement your custom tool logic here
        return f"Processed query: {query}"

class ToolService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self._built_in_tools = {
            # Browser and Web Tools
            "browserbase_load": {
                "name": "browserbase_load",
                "description": "A tool for interacting with and extracting data from web browsers",
                "type": "built_in"
            },
            "code_docs_search": {
                "name": "code_docs_search",
                "description": "A RAG tool optimized for searching through code documentation and related technical documents",
                "type": "built_in"
            },
            "code_interpreter": {
                "name": "code_interpreter",
                "description": "A tool for interpreting python code",
                "type": "built_in"
            },
            "composio": {
                "name": "composio",
                "description": "Enables use of Composio tools",
                "type": "built_in"
            },

            # File Processing Tools
            "csv_search": {
                "name": "csv_search",
                "description": "A RAG tool designed for searching within CSV files, tailored to handle structured data",
                "type": "built_in"
            },
            "dalle": {
                "name": "dalle",
                "description": "A tool for generating images using the DALL-E API",
                "type": "built_in"
            },
            "directory_search": {
                "name": "directory_search",
                "description": "A RAG tool for searching within directories, useful for navigating through file systems",
                "type": "built_in"
            },
            "directory_read": {
                "name": "directory_read",
                "description": "Facilitates reading and processing of directory structures and their contents",
                "type": "built_in"
            },
            "docx_search": {
                "name": "docx_search",
                "description": "A RAG tool aimed at searching within DOCX documents, ideal for processing Word files",
                "type": "built_in"
            },

            # Search and Web Tools
            "exa_search": {
                "name": "exa_search",
                "description": "A tool designed for performing exhaustive searches across various data sources",
                "type": "built_in"
            },
            "file_read": {
                "name": "file_read",
                "description": "Enables reading and extracting data from files, supporting various file formats",
                "type": "built_in"
            },
            "firecrawl_search": {
                "name": "firecrawl_search",
                "description": "A tool to search webpages using Firecrawl and return the results",
                "type": "built_in"
            },
            "firecrawl_crawl": {
                "name": "firecrawl_crawl",
                "description": "A tool for crawling webpages using Firecrawl",
                "type": "built_in"
            },
            "firecrawl_scrape": {
                "name": "firecrawl_scrape",
                "description": "A tool for scraping webpages URL using Firecrawl and returning its contents",
                "type": "built_in"
            },
            "github_search": {
                "name": "github_search",
                "description": "A RAG tool for searching within GitHub repositories, useful for code and documentation search",
                "type": "built_in"
            },
            "serper_dev": {
                "name": "serper_dev",
                "description": "A specialized tool for development purposes, with specific functionalities under development",
                "type": "built_in"
            },

            # Document Processing Tools
            "txt_search": {
                "name": "txt_search",
                "description": "A RAG tool focused on searching within text (.txt) files, suitable for unstructured data",
                "type": "built_in"
            },
            "json_search": {
                "name": "json_search",
                "description": "A RAG tool designed for searching within JSON files, catering to structured data handling",
                "type": "built_in"
            },
            "mdx_search": {
                "name": "mdx_search",
                "description": "A RAG tool tailored for searching within Markdown (MDX) files, useful for documentation",
                "type": "built_in"
            },
            "pdf_search": {
                "name": "pdf_search",
                "description": "A RAG tool aimed at searching within PDF documents, ideal for processing scanned documents",
                "type": "built_in"
            },
            "pg_search": {
                "name": "pg_search",
                "description": "A RAG tool optimized for searching within PostgreSQL databases, suitable for database queries",
                "type": "built_in"
            },

            # Vision and Media Tools
            "vision": {
                "name": "vision",
                "description": "A tool for processing and analyzing images",
                "type": "built_in"
            },
            "rag": {
                "name": "rag",
                "description": "A general-purpose RAG tool capable of handling various data sources and types",
                "type": "built_in"
            },

            # Web Scraping Tools
            "scrape_element": {
                "name": "scrape_element",
                "description": "Enables scraping specific elements from websites, useful for targeted data extraction",
                "type": "built_in"
            },
            "scrape_website": {
                "name": "scrape_website",
                "description": "Facilitates scraping entire websites, ideal for comprehensive data collection",
                "type": "built_in"
            },
            "website_search": {
                "name": "website_search",
                "description": "A RAG tool for searching website content, optimized for web data extraction",
                "type": "built_in"
            },
            "xml_search": {
                "name": "xml_search",
                "description": "A RAG tool designed for searching within XML files, suitable for structured data formats",
                "type": "built_in"
            },

            # YouTube Tools
            "youtube_channel_search": {
                "name": "youtube_channel_search",
                "description": "A RAG tool for searching within YouTube channels, useful for video content analysis",
                "type": "built_in"
            },
            "youtube_video_search": {
                "name": "youtube_video_search",
                "description": "A RAG tool aimed at searching within YouTube videos, ideal for video data extraction",
                "type": "built_in"
            }
        }
        
        self._tool_implementations = {
            "browserbase_load": BrowserbaseLoadTool,
            "code_docs_search": CodeDocsSearchTool,
            "code_interpreter": CodeInterpreterTool,
            "composio": ComposioTool,
            "csv_search": CSVSearchTool,
            "dalle": DallETool,
            "directory_search": DirectorySearchTool,
            "directory_read": DirectoryReadTool,
            "docx_search": DOCXSearchTool,
            "exa_search": EXASearchTool,
            "file_read": FileReadTool,
            "firecrawl_search": FirecrawlSearchTool,
            "firecrawl_crawl": FirecrawlCrawlWebsiteTool,
            "firecrawl_scrape": FirecrawlScrapeWebsiteTool,
            "github_search": GithubSearchTool,
            "serper_dev": SerperDevTool,
            "txt_search": TXTSearchTool,
            "json_search": JSONSearchTool,
            "mdx_search": MDXSearchTool,
            "pdf_search": PDFSearchTool,
            "pg_search": PGSearchTool,
            "vision": VisionTool,
            "rag": RagTool,
            "scrape_element": ScrapeElementFromWebsiteTool,
            "scrape_website": ScrapeWebsiteTool,
            "website_search": WebsiteSearchTool,
            "xml_search": XMLSearchTool,
            "youtube_channel_search": YoutubeChannelSearchTool,
            "youtube_video_search": YoutubeVideoSearchTool
        }
        
        self._custom_tools: Dict[str, Dict[str, str]] = {}
        self._custom_tool_implementations: Dict[str, Type[BaseTool]] = {}

    async def list_tools(self) -> List[Dict[str, str]]:
        """List all available tools."""
        return list(self._built_in_tools.values()) + list(self._custom_tools.values())

    def get_tool_implementation(self, name: str) -> Type[BaseTool]:
        """Get a tool implementation by name."""
        return self._tool_implementations.get(name) or self._custom_tool_implementations.get(name)

    async def register_custom_tool(self, name: str, description: str, tool_class: Type[BaseTool]) -> None:
        """Register a new custom tool."""
        self._custom_tools[name] = {
            "name": name,
            "description": description,
            "type": "custom"
        }
        self._custom_tool_implementations[name] = tool_class

# Example of creating and registering a custom tool:
"""
class MyCustomTool(BaseTool):
    name: str = "my_custom_tool"
    description: str = "Description of what my tool does"
    args_schema: Type[BaseModel] = CustomToolInput

    def _run(self, query: str) -> str:
        # Implement your custom tool logic here
        return f"Custom tool result for: {query}"

# Register the custom tool:
await tool_service.register_custom_tool(
    name="my_custom_tool",
    description="Description of what my tool does",
    tool_class=MyCustomTool
)
""" 