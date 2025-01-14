from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
import logging
from typing import Union, Dict, Any
from app.utils.error_formatter import get_formatted_traceback, format_error_message

logger = logging.getLogger(__name__)

async def error_handler_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as exc:
        # Get formatted stack trace
        stack_frames = get_formatted_traceback()
        
        # Format and log the error message
        error_message = format_error_message(exc, stack_frames)
        logger.error(error_message)
        
        # In development, include the formatted error in the response
        if request.app.debug:
            return create_error_response(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                message={
                    "error": str(exc),
                    "type": exc.__class__.__name__,
                    "stack_trace": stack_frames
                }
            )
        
        # In production, return a generic error message
        return create_error_response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message="Internal server error"
        )

def create_error_response(status_code: int, message: Union[str, Dict[str, Any]]) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": message}
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    stack_frames = get_formatted_traceback()
    error_message = format_error_message(exc, stack_frames)
    logger.error(error_message)
    
    return create_error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        message={"detail": exc.errors()}
    )

async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    stack_frames = get_formatted_traceback()
    error_message = format_error_message(exc, stack_frames)
    logger.error(error_message)
    
    return create_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        message="Database error occurred"
    ) 