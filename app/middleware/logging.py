import logging
import time
from typing import Callable
from fastapi import Request, Response
import json
from datetime import datetime

logger = logging.getLogger(__name__)

async def log_request_middleware(request: Request, call_next: Callable) -> Response:
    # Request logging
    start_time = time.time()
    
    # Get request details
    request_id = request.headers.get('X-Request-ID', str(time.time()))
    method = request.method
    url = str(request.url)
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get('User-Agent')

    # Log request at DEBUG level instead of INFO
    logger.debug(
        f"Request started - {method} {url}",
        extra={
            "request_id": request_id,
            "method": method,
            "url": url,
            "client_ip": client_ip,
            "user_agent": user_agent,
            "timestamp": datetime.utcnow().isoformat(),
            "type": "request_start"
        }
    )

    # Process request
    response = await call_next(request)
    
    # Calculate processing time
    process_time = time.time() - start_time
    
    # Log response at DEBUG level instead of INFO
    logger.debug(
        f"Request completed - {method} {url} - Status: {response.status_code}",
        extra={
            "request_id": request_id,
            "method": method,
            "url": url,
            "status_code": response.status_code,
            "process_time": f"{process_time:.3f}s",
            "timestamp": datetime.utcnow().isoformat(),
            "type": "request_end"
        }
    )

    # Add custom headers
    response.headers["X-Process-Time"] = f"{process_time:.3f}s"
    response.headers["X-Request-ID"] = request_id
    
    return response 