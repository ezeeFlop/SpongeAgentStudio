from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy_utils import database_exists, create_database
from app.api.v1 import router as api_v1_router
from app.database import engine, Base
from app.core.logging_config import setup_logging
import logging
from contextlib import asynccontextmanager
from app.core.database import ensure_database_exists

from app.middleware.cors import setup_cors
from app.middleware.db_health import DatabaseHealthMiddleware
from app.middleware.error_handler import error_handler_middleware, sqlalchemy_exception_handler, validation_exception_handler
from app.middleware.logging import log_request_middleware
from app.middleware.validation import request_validation_middleware
from sqlalchemy.exc import SQLAlchemyError

setup_logging()
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database exists
    await ensure_database_exists()
    
    # Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield
    
    # Cleanup
    await engine.dispose()

app = FastAPI(
    title="SpongeAgent Studio API",
    description="API for managing AI agents and crews",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(DatabaseHealthMiddleware)

# Add middlewares
app.middleware("http")(error_handler_middleware)
app.middleware("http")(request_validation_middleware)
app.middleware("http")(log_request_middleware)

# Configure CORS
setup_cors(app)

# Exception handlers
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)

# Include versioned API router
app.include_router(api_v1_router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {
        "message": "Welcome to SpongeAgent Studio API",
        "version": "1.0.0",
        "docs_url": "/docs"
    } 