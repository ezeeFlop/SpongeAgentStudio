#!/bin/bash

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "Virtual environment not found. Creating one..."
    python3 -m venv venv
    source venv/bin/activate
fi

# Install dependencies if needed
pip install -r app/requirements.txt

# Run migrations
#alembic upgrade head

# Set PYTHONPATH and start the FastAPI server
export PYTHONPATH=$PYTHONPATH:$(pwd)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload 