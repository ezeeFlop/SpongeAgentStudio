from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

def setup_cors(app):
    """Setup CORS middleware with configured origins"""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.FRONTEND_URL],  # Only allow frontend initially
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def cors_origin_middleware(request, call_next):
        # Skip CORS check for OPTIONS requests
        if request.method == "OPTIONS":
            return await call_next(request)

        # Skip CORS check for internal API routes
        if request.url.path.startswith(f"{settings.API_V1_STR}/verify-access"):
            return await call_next(request)

        # Get origin from headers
        origin = request.headers.get("origin")
        if not origin:
            return await call_next(request)

        # Allow frontend URL
        if origin == settings.FRONTEND_URL:
            return await call_next(request)

        return await call_next(request)
