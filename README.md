# SpongeAgent Studio

SpongeAgent Studio is a modern web application for managing and orchestrating AI agents using the [CrewAI framework](https://github.com/joaomdmoura/crewAI). It provides a sophisticated interface for creating, managing, and monitoring AI agents and their collaborative crews, making it easier to build and deploy complex AI workflows.

![SpongeAgent Studio Demo](demo.gif)

## 🐳 Quick Start with Docker

### Setting up PostgreSQL
1. Start a PostgreSQL instance:
```bash
docker run --name sponge-postgres \
  -e POSTGRES_USER=sponge \
  -e POSTGRES_PASSWORD=sponge \
  -e POSTGRES_DB=spongeagent \
  -p 5432:5432 \
  -d postgres:15
```

2. Verify the container is running:
```bash
docker ps
```

### Environment Setup
Create a `.env` file based on `.env-example`:

```env

# Database Configuration
POSTGRES_SERVER=localhost
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=spongeagent
POSTGRES_PORT=5432

# Frontend Configuration
FRONTEND_URL=http://localhost:5173

# API Keys
OPENAI_API_KEY=your_openai_api_key
SERPER_API_KEY=your_serper_api_key 
# OPENAI_API_BASE="OPTIONAL-FILL-IN-YOUR-OPENAI-CUSTOM-BASE/PROXY-URL"
# OPENAI_PROXY_MODELS="openai/gpt4o,openai/gpt4omini,openai/geminiflash,openai/geminipro,openai/claudesonnet35"
# GROQ_API_KEY="FILL-IN-YOUR-GROQ_API_KEY"
# LMSTUDIO_API_BASE="http://localhost:1234/v1"
# ANTHROPIC_API_KEY="FILL-IN-YOUR-ANTHROPIC_API_KEY"
# AGENTOPS_API_KEY="FILL-IN-YOUR-AGENTOPS_API_KEY"
# OLLAMA_HOST="http://localhost:11434"
# OLLAMA_MODELS="ollama/llama3.2,ollama/llama3.1,ollama/gemma2,ollama/phi3.5"

```


## 🌟 Features

### Agent Management
- **Agent Creation**: Create and configure AI agents with specific roles and capabilities
- **Agent Configuration**: Define agent properties, tools, and behaviors
- **Agent Monitoring**: Track agent status and performance

### Crew Orchestration
- **Crew Assembly**: Create crews by combining multiple agents for complex tasks
- **Workflow Definition**: Define task sequences and agent interactions
- **Execution Monitoring**: Real-time monitoring of crew execution and task progress

### Task Management
- **Task Creation**: Create and assign tasks to agents or crews
- **Task Tracking**: Monitor task status and progress
- **Output Management**: View and manage task outputs and results

### Real-time Monitoring
- **WebSocket Integration**: Real-time updates on agent and crew status
- **Execution Logs**: Detailed logging of agent actions and crew workflows
- **Performance Metrics**: Track execution time and success rates

## 🛠 Tech Stack

### Frontend
- **Build Tool**: Vite (v5.4.2)
- **Framework**: React (v18.3.1) with TypeScript (v5.5.3)
- **Styling**: Tailwind CSS (v3.4.1)
- **State Management**: React Query for server state
- **WebSocket**: Real-time updates for agent/crew status
- **UI Components**: Lucide React for icons

### Backend
- **Framework**: FastAPI
- **AI Framework**: CrewAI
- **Database**: SQLAlchemy with async support
- **Task Processing**: Async task handling
- **WebSocket**: Real-time agent/crew status updates
- **API Documentation**: OpenAPI/Swagger

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Python (v3.9 or higher)
- PostgreSQL database
- OpenAI API key for CrewAI

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Backend Setup
```bash
cd app
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Environment Variables
Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost/dbname

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Application
APP_ENV=development
DEBUG=true
```

## 📁 Project Structure

```
.
├── app/                # Backend application
│   ├── api/           # API routes and endpoints
│   ├── core/          # Core functionality
│   ├── engine/        # CrewAI integration
│   ├── models/        # Database models
│   │   ├── agent.py   # Agent model
│   │   ├── crew.py    # Crew model
│   │   └── task.py    # Task model
│   ├── schemas/       # Pydantic schemas
│   └── services/      # Business logic
├── frontend/          # Frontend application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   │   ├── agents/  # Agent-related components
│   │   │   ├── crews/   # Crew-related components
│   │   │   └── tasks/   # Task-related components
│   │   ├── lib/         # Utilities and API clients
│   │   └── pages/       # Page components
```

## 🔧 Core Components

### Agents
- Create and configure AI agents with specific roles
- Define agent capabilities and tools
- Monitor agent status and performance

### Crews
- Assemble crews from multiple agents
- Define workflows and task sequences
- Monitor crew execution in real-time

### Tasks
- Create and assign tasks
- Track task progress and status
- View task outputs and results

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details. 