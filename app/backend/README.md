# Backend Generator

AI-powered backend code generator using OpenAI and BullMQ for job processing.

## Architecture

```
backend/
├── core/           # Express API server
├── workers/        # BullMQ job workers
└── docker-compose.yml  # Redis service
```

- **Core**: Express API that accepts generation requests and queues jobs
- **Workers**: Process queued jobs using AI to generate backend code
- **Redis**: Message broker for BullMQ job queue

## Prerequisites

- [Bun](https://bun.sh/) v1.0+
- [Docker](https://www.docker.com/) (for Redis)
- OpenAI API key

## Quick Start

### 1. Setup Environment

```bash
cd app/backend

# Create .env file
cp .env.example .env

# Edit .env and add your OpenAI API key
```

Required environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key | **required** |
| `OPENAI_MODEL` | Model to use | `gpt-4o` |
| `PORT` | API server port | `8080` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `LOG_LEVEL` | Log level | `info` |

### 2. Start Redis

```bash
docker compose up -d
```

### 3. Install Dependencies

```bash
# Install core dependencies
cd core && bun install

# Install worker dependencies
cd ../workers && bun install
```

### 4. Run the Services

Open two terminal windows:

**Terminal 1 - API Server:**
```bash
cd app/backend/core
bun run dev
```

**Terminal 2 - Worker:**
```bash
cd app/backend/workers
bun run dev:worker
```

## API Endpoints

### Health Check

```http
GET /health
```

Returns server health status.

### Readiness Check

```http
GET /ready
```

Returns readiness status including dependency checks.

### Generate Backend

```http
POST /generate-backend
Content-Type: application/json

{
  "prompt": "Create a REST API for a todo app with CRUD operations"
}
```

**Response:**
```json
{
  "message": "Job queued",
  "jobId": "123",
  "statusUrl": "/jobs/123"
}
```

### Check Job Status

```http
GET /jobs/:jobId
```

**Response:**
```json
{
  "jobId": "123",
  "state": "completed",
  "progress": 100,
  "result": {
    "success": true,
    "files": ["src/index.ts", "src/routes/todo.ts"]
  }
}
```

Job states: `waiting` | `active` | `completed` | `failed`

### Cancel Job

```http
DELETE /jobs/:jobId
```

## Production

```bash
# Core
cd core && bun run start

# Workers (run multiple for scaling)
cd workers && bun run dev:worker
```

## Troubleshooting

**Redis connection failed:**
```bash
# Check if Redis is running
docker compose ps

# Restart Redis
docker compose restart redis
```

**Missing OPENAI_API_KEY:**
- Ensure `.env` file exists in `app/backend/`
- Verify the key is set correctly

**Port already in use:**
- Change `PORT` in `.env` or stop the conflicting process

