from fastapi import Request
import logging
from typing import Callable

from fastapi.responses import JSONResponse
from app.core.config import settings

logger = logging.getLogger(__name__)

async def request_validation_middleware(request: Request, call_next: Callable):
    # Log incoming request
    logger.info(f"Incoming request: {request.method} {request.url}")
    
    # Allow access to static files and documentation
    allowed_paths = ["/docs", "/redoc", "/openapi.json", "/", "/uploads"]
    if any(request.url.path.startswith(path) for path in allowed_paths):
        return await call_next(request)
    
    # Validate API version
    if not request.url.path.startswith(settings.API_V1_STR):
        logger.warning(f"Invalid API version requested: {request.url.path}")
        return JSONResponse(
            status_code=404,
            content={"error": "Invalid API version"}
        )

    # Process request and log response time
    import time
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    logger.info(f"Request processed in {process_time:.3f} seconds")
    
    return response 