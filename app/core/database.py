from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
import asyncpg
import logging

logger = logging.getLogger(__name__)

async def ensure_database_exists():
    """Ensure the database exists, creating it if necessary."""
    try:
        # Connect to the default postgres database to check if our database exists
        sys_conn = await asyncpg.connect(
            user=settings.POSTGRES_USER,
            password=settings.POSTGRES_PASSWORD,
            host=settings.POSTGRES_SERVER,
            port=settings.POSTGRES_PORT,
            database='postgres'
        )
        
        # Check if database exists
        result = await sys_conn.fetchrow(
            'SELECT 1 FROM pg_database WHERE datname = $1',
            settings.POSTGRES_DB
        )
        
        if not result:
            # Database doesn't exist, so create it
            await sys_conn.execute(f'CREATE DATABASE {settings.POSTGRES_DB}')
            logger.info(f"Created database {settings.POSTGRES_DB}")
        
        await sys_conn.close()
        
    except Exception as e:
        logger.error(f"Error ensuring database exists: {e}")
        raise

engine = create_async_engine(
    settings.SQLALCHEMY_DATABASE_URI,
    echo=False,
    future=True
)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close() 