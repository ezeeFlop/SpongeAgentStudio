import traceback
from fastapi import Request, Response
from sqlalchemy.exc import OperationalError
from starlette.middleware.base import BaseHTTPMiddleware
from app.database import AsyncSessionLocal
from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)

class DatabaseHealthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            # Test database connection before processing request
            async with AsyncSessionLocal() as session:
                try:
                    await session.execute(text('SELECT 1'))
                    await session.commit()
                except Exception as e:
                    logger.error(f"Database health check failed: {str(e)}")
                    return Response(
                        content="Database connection error",
                        status_code=503
                    )

            response = await call_next(request)
            return response

        except Exception as e:
            logger.error(f"Middleware error: {str(e)} stack trace: {traceback.format_exc()}")
            return Response(
                content="Internal server error",
                status_code=500
            )