# Agentic Robotics Evaluator

A conversational AI agent designed to help robotics students reflect on their learning through Socratic questioning and guided dialogue. The agent guides students through structured reflection sessions, helping them articulate challenges, explore solutions, and plan next steps.

---

## 🚀 TL;DR - Run It Now

```bash
# Clone and start everything
git clone <repo-url>
cd AgenticRoboticsEvaluator/infra
docker compose up --build

# Open the app (admin user is auto-created on first run)
open http://localhost:3000
```

**Login:** `admin` / `admin123`

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Current Status](#current-status)
3. [Architecture](#architecture)
4. [Tech Stack](#tech-stack)
5. [Quick Start](#quick-start)
6. [Project Structure](#project-structure)
7. [Key Components Explained](#key-components-explained)
8. [What's Working vs. What's Planned](#whats-working-vs-whats-planned)
9. [Development Guide](#development-guide)
10. [Documentation](#documentation)

---

## Project Overview

### The Problem
Robotics students benefit from reflecting on their projects, but coaches have limited time for 1:1 conversations. Students need a supportive "near-peer" they can talk to weekly after team meetings.

### The Solution
A chat-based AI agent that:
- Guides students through a **7-stage reflection protocol**
- Uses **Socratic questioning** (asks questions rather than giving answers)
- Maintains **conversation history** across sessions
- Includes **safety monitoring** for concerning content (planned)
- Provides **session summaries** for coaches to review (planned)

### Design Principles
- **Near-peer tone**: Friendly and supportive, not authoritative
- **Student-driven**: The student leads the conversation
- **Scaffolded reflection**: Structured stages ensure meaningful dialogue
- **Privacy-conscious**: Minimal data collection, clear boundaries

---

## Current Status

This repository contains the **D1 Foundation** - a fully functional skeleton application.

| Layer | Status | Description |
|-------|--------|-------------|
| Infrastructure | ✅ Complete | Docker Compose with PostgreSQL, backend, and frontend |
| Database | ✅ Complete | All tables created via Alembic migrations |
| Authentication | ✅ Complete | JWT-based login with role support (STUDENT/ADMIN) |
| API | ✅ Complete | All CRUD endpoints for sessions, messages, users |
| Chat UI | ✅ Complete | Functional chat interface with message display |
| Conversation Logic | ⚠️ Stub | Returns template responses (no LLM integration yet) |

**What you can do right now:**
1. Log in as admin or student
2. Start a chat session
3. Send messages and receive (placeholder) responses
4. View conversation history

**What's coming next (D2):**
- Real LLM integration (OpenAI/Claude)
- Intelligent stage progression
- Safety monitoring
- Session summaries

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
│                    (Next.js 14 + TypeScript)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │
│  │ Login Page  │  │  Chat Page  │  │  AuthContext (JWT storage)  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────────┘  │
│                            │                                         │
│                    /api/* proxy                                      │
└────────────────────────────┼────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           BACKEND                                    │
│                    (FastAPI + SQLAlchemy)                           │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                      API Routes                               │   │
│  │  /auth/*  │  /sessions/*  │  /admin/*  │  /health            │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                            │                                         │
│                            ▼                                         │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                     FlowEngine                                │   │
│  │         (Conversation flow & response generation)            │   │
│  │                                                               │   │
│  │   greeting → context → problem → reflection → brainstorm     │   │
│  │                    → action_plan → wrap_up                    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                            │                                         │
│                            ▼                                         │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                   SQLAlchemy Models                           │   │
│  │  Student │ Session │ Message │ SessionSummary │ SafetyIncident│   │
│  └──────────────────────────────────────────────────────────────┘   │
└────────────────────────────┼────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        PostgreSQL 15                                 │
│         students │ sessions │ messages │ session_summaries          │
│                        │ safety_incidents                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Why These Technologies?

| Layer | Technology | Purpose | Why We Chose It |
|-------|------------|---------|-----------------|
| **Frontend** | Next.js 14 | React framework with App Router | Server-side rendering, built-in routing, great DX |
| | TypeScript | Type safety | Catch errors at compile-time, better autocomplete |
| | Tailwind CSS | Utility-first styling | Rapid UI development, consistent design |
| | Axios | HTTP client | Simple API calls with interceptors for auth |
| **Backend** | FastAPI | Async Python web framework | Fast, automatic API docs, modern Python async/await |
| | SQLAlchemy 2.0 | ORM (Object-Relational Mapper) | Write Python objects instead of SQL queries, database-agnostic |
| | Alembic | Database migrations | Version control for database schema changes |
| | Pydantic | Request/response validation | Automatic data validation and serialization |
| | python-jose | JWT token handling | Secure stateless authentication |
| | bcrypt | Password hashing | Industry-standard password security |
| **Database** | PostgreSQL 15 | Relational database | ACID compliance, JSON support, scalability |
| **Infrastructure** | Docker Compose | Container orchestration | One-command setup, consistent environments |

### Key Architecture Decisions

**SQLAlchemy (ORM)**
- **What:** Translates Python objects to database tables
- **Why:** Instead of writing raw SQL, you work with Python classes
- **Example:** `db.query(Student).filter(Student.username == "admin")` vs `SELECT * FROM students WHERE username = 'admin'`
- **Benefit:** Type-safe, IDE autocomplete, database-agnostic (switch from PostgreSQL to MySQL without code changes)

**FastAPI**
- **What:** Modern async Python web framework
- **Why:** Built-in data validation (Pydantic), auto-generated API docs, excellent async support
- **Benefit:** Automatic `/docs` endpoint with interactive API testing

**JWT Authentication**
- **What:** JSON Web Tokens for stateless auth
- **Why:** No server-side session storage needed, works great for APIs
- **How:** User logs in → receives token → includes token in every request

**Docker Compose**
- **What:** Multi-container orchestration
- **Why:** Ensures everyone runs the same PostgreSQL version, Python version, Node version
- **Benefit:** `docker compose up` works identically on Mac, Windows, Linux

---

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Git

### Setup Steps

```bash
# 1. Clone the repository
git clone <repo-url>
cd AgenticRoboticsEvaluator

# 2. Start all services (builds containers on first run)
cd infra
docker compose up --build

# 3. Open the application (admin user created automatically on first run)
open http://localhost:3000
```

### Default Credentials
- **Username:** `admin`
- **Password:** `admin123`

### Ports
| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Backend API | 8000 | http://localhost:8000 |
| PostgreSQL | 5433 | localhost:5433 |

---

## Project Structure

```
AgenticRoboticsEvaluator/
│
├── backend/                      # Python FastAPI application
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py           # Dependency injection (auth, DB session)
│   │   │   └── routes/
│   │   │       ├── auth.py       # Login, get current user
│   │   │       ├── sessions.py   # Create/list sessions, chat endpoint
│   │   │       ├── admin.py      # Admin-only user/session management
│   │   │       └── health.py     # Health check endpoint
│   │   │
│   │   ├── core/
│   │   │   ├── config.py         # Environment configuration
│   │   │   └── security.py       # JWT creation/validation, password hashing
│   │   │
│   │   ├── db/
│   │   │   ├── base.py           # SQLAlchemy declarative base
│   │   │   └── session.py        # Database session factory
│   │   │
│   │   ├── models/               # SQLAlchemy ORM models
│   │   │   ├── student.py        # User model (students + admins)
│   │   │   ├── session.py        # Chat session model
│   │   │   ├── message.py        # Individual message model
│   │   │   ├── session_summary.py # Structured session extraction (NOT YET USED)
│   │   │   └── safety_incident.py # Safety flag tracking (NOT YET USED)
│   │   │
│   │   ├── schemas/              # Pydantic request/response schemas
│   │   │   ├── auth.py           # Login request/response
│   │   │   ├── student.py        # Student CRUD schemas
│   │   │   ├── session.py        # Session schemas
│   │   │   └── message.py        # Message and chat schemas
│   │   │
│   │   ├── services/
│   │   │   └── flow_engine.py    # Conversation flow logic (see below)
│   │   │
│   │   └── main.py               # FastAPI app entry point
│   │
│   ├── alembic/                  # Database migrations
│   │   └── versions/
│   │       └── 001_initial_schema.py
│   │
│   ├── tests/                    # Pytest test files
│   ├── requirements.txt          # Python dependencies
│   ├── Dockerfile
│   └── seed_admin.py             # Script to create admin user
│
├── frontend/                     # Next.js application
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx        # Root layout with AuthProvider
│   │   │   ├── page.tsx          # Home page (redirects to login/chat)
│   │   │   ├── login/
│   │   │   │   └── page.tsx      # Login form
│   │   │   └── chat/
│   │   │       └── page.tsx      # Main chat interface
│   │   │
│   │   └── lib/
│   │       ├── api.ts            # Axios client with auth interceptor
│   │       └── auth-context.tsx  # React context for auth state
│   │
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── Dockerfile
│
├── infra/                        # Infrastructure configuration
│   ├── docker-compose.yml        # Multi-container setup
│   └── .env.example              # Environment template
│
└── docs/                         # Documentation
    ├── SYSTEM.md                 # Full technical specification
    ├── SETUP.md                  # Detailed setup guide
    └── TASKS_D1.md               # Implementation checklist
```

---

## Key Components Explained

### FlowEngine (`backend/app/services/flow_engine.py`)

**FlowEngine is a custom Python class we created** (not a library) that manages the conversation flow. It is the "brain" of the chat system.

**What it does:**
1. Tracks which **stage** the conversation is in
2. Decides when to **advance** to the next stage
3. Generates **responses** (currently templates, will be LLM-generated)

**The 7 conversation stages:**
```
1. greeting           → Initial rapport building
2. context_gathering  → Understanding the student's situation
3. problem_exploration→ Exploring challenges
4. guided_reflection  → Socratic questioning
5. solution_brainstorm→ Exploring possible solutions
6. action_planning    → Concrete next steps
7. wrap_up            → Summary and closing
```

**Current behavior (D1 stub):**
- Returns template responses based on current stage
- Advances stages when user says keywords like "next", "continue", "done"
- Does NOT call any LLM API yet

**Future behavior (D2):**
- Will call OpenAI/Claude API for intelligent responses
- Will detect stage transitions from conversation content
- Will run safety monitoring in parallel

### Authentication Flow

```
1. User submits username/password to POST /auth/login
2. Backend validates credentials, returns JWT token
3. Frontend stores token in localStorage
4. All subsequent requests include Authorization: Bearer <token>
5. Backend validates token on each request via dependency injection
```

### Database Models

| Model | Table | Purpose | Status |
|-------|-------|---------|--------|
| **Student** | `students` | Users (both students and admins) | ✅ Used |
| **Session** | `sessions` | A chat session with stage tracking | ✅ Used |
| **Message** | `messages` | Individual chat messages | ✅ Used |
| **SessionSummary** | `session_summaries` | Structured extraction from sessions | ❌ Not used yet |
| **SafetyIncident** | `safety_incidents` | Flagged concerning messages | ❌ Not used yet |

---

## What's Working vs. What's Planned

### ✅ Working Now (D1 Complete)

| Feature | Details |
|---------|---------|
| User authentication | JWT login, role-based access (STUDENT/ADMIN) |
| Session management | Create, list, view sessions |
| Chat functionality | Send messages, receive responses, persist to database |
| Admin endpoints | CRUD operations for users and sessions |
| Docker infrastructure | One-command startup with `docker compose up` |
| Database migrations | Alembic manages schema changes |

### ⚠️ Partially Implemented (Stubs)

| Feature | Current State | What's Missing |
|---------|---------------|----------------|
| FlowEngine responses | Template strings | LLM API integration |
| Stage progression | Keyword-based ("next") | Content-aware detection |

### ❌ Not Yet Implemented (D2/D3)

| Feature | Description | Priority |
|---------|-------------|----------|
| LLM integration | OpenAI/Claude API calls | D2 - High |
| Safety monitoring | Detect concerning content, alert admins | D2 - High |
| Session summaries | Auto-generate structured summaries | D2 - Medium |
| Admin dashboard UI | Web interface for admin functions | D3 - Medium |
| Session history UI | Browse past sessions in frontend | D3 - Low |

---

## Development Guide

### Running the Application

```bash
# Start all services
cd infra
docker compose up

# Start with rebuild (after code changes to Dockerfile)
docker compose up --build

# Stop all services
docker compose down

# Stop and remove volumes (clears database)
docker compose down -v
```

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
```

### Running Tests

```bash
docker compose exec backend pytest -v
```

### Database Access

```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U evaluator -d evaluator

# Common queries
SELECT * FROM students;
SELECT * FROM sessions;
SELECT * FROM messages ORDER BY created_at DESC LIMIT 10;
```

### API Documentation

When the backend is running, visit:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### Hot Reloading

Both frontend and backend support hot reloading:
- **Backend:** Changes to Python files auto-restart uvicorn
- **Frontend:** Next.js fast refresh on file save

---

## Documentation

| Document | Description |
|----------|-------------|
| [SYSTEM.md](docs/SYSTEM.md) | Complete technical specification with data models, API contracts, and architecture decisions |
| [SETUP.md](docs/SETUP.md) | Detailed setup instructions with troubleshooting |
| [TASKS_D1.md](docs/TASKS_D1.md) | Implementation checklist for D1 milestone |

---

## Contributing

1. Create a feature branch from `main`
2. Make changes with clear commit messages
3. Ensure tests pass: `docker compose exec backend pytest`
4. Submit a pull request

---

## License

MIT
