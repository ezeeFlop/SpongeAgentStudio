import asyncio
import asyncpg

async def drop_database():
    # Connect to the default 'postgres' database to drop our target database
    conn = await asyncpg.connect(
        user='postgres',
        password='postgres',
        host='localhost',
        port=5432,
        database='postgres'
    )
    
    try:
        # Terminate all connections to the target database
        await conn.execute('''
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = 'spongeagent'
            AND pid <> pg_backend_pid();
        ''')
        
        # Drop the database if it exists
        await conn.execute('DROP DATABASE IF EXISTS spongeagent')
        print("Database 'spongeagent' has been dropped successfully.")
    
    except Exception as e:
        print(f"Error dropping database: {e}")
    
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(drop_database()) 