# Collaborative Reflection Agent

A conversational AI agent designed to guide high school robotics students through metacognitive reflection on their **teamwork experience**. Grounded in Kolb's Experiential Learning Theory (ELT) and the Collaborative Problem Solving (CPS) framework, the agent helps students recall team experiences, observe dynamics, make meaning, and plan experiments — all in a 10-minute session.

---

## Quick Start

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
High school robotics students benefit from reflecting on their **teamwork**, but coaches have limited time for 1:1 conversations. Students need a supportive "near-peer" they can talk to weekly after team meetings — one that focuses on *how the team worked together*, not just the robot.

### The Solution
A chat-based AI agent that:
- Guides students through a **6-stage ELT reflection protocol** focused on teamwork
- Uses **Socratic questioning** with an acknowledge-and-pivot strategy for robot talk
- Probes for **CPS framework** indicators during the observe_dynamics stage
- Maintains **cross-session memory** via evaluation profiles (passive, student-initiated)
- Produces **structured evaluations** with ELT quality assessment and CPS analysis
- Enforces **10-minute time-bounded sessions** with graceful wrap-up

### Design Principles
- **Near-peer tone**: Like a slightly older student, not a teacher or coach
- **Teamwork-focused**: The robot is context; the team is the subject
- **Hybrid transitions**: LLM recommends, FlowEngine decides (deterministic guardrails)
- **Research-friendly**: Full audit trail with transition decisions, CPS indicators, and ELT assessment
- **Privacy-conscious**: Minimal data collection, clear boundaries

---

## Current Status

The core system is fully functional with LLM integration, a dashboard UI, and post-session evaluation.

| Layer | Status | Description |
|-------|--------|-------------|
| Infrastructure | Complete | Docker Compose with PostgreSQL, backend, and frontend |
| Database | Complete | All tables created via Alembic migrations |
| Authentication | Complete | JWT-based login with role support |
| API | Complete | All CRUD endpoints for sessions, messages, users |
| LLM Integration | Complete | Llama 3.3 70B via UF Navigator, JSON mode, retry logic, structured responses |
| Dashboard UI | Complete | Session sidebar, chat, stage progress, metadata display |
| Post-Session Eval | Complete | ELT assessment, student profiling, CPS analysis, recommendations |
| CPS Framework | Complete | Database-driven indicators, admin API, dynamic prompt injection |
| Hybrid Transitions | Complete | Min/max turns, required signal heuristics, LLM override capability |
| Cross-Session Memory | Complete | Passive memory from evaluation profiles, student-initiated only |
| Time-Bounded Sessions | Complete | 10-minute limit with graceful wrap-up at 70% threshold |
| Safety Monitoring | Planned | Database table exists, detection logic not yet implemented |

**What you can do right now:**
1. Log in as admin or student
2. Start a chat session and have a real conversation focused on teamwork
3. Watch the agent progress through 6 ELT-mapped reflection stages
4. View hybrid transition decisions and CPS indicators in message metadata
5. See a full evaluation with ELT quality assessment when the session completes
6. Manage CPS indicators via the admin API
7. Inspect any session with detailed metadata on the inspect page

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
│                    (Next.js 14 + TypeScript)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │
│  │ Login Page  │  │  Dashboard  │  │  AuthContext (JWT storage)  │  │
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
│  │  /auth/*  │  /sessions/*  │  /stages  │  /admin/*  │ /health │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                            │                                         │
│                            ▼                                         │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              FlowEngine + LLM Client + Evaluator              │   │
│  │                                                               │   │
│  │  prompts.py ──► flow_engine.py ──► llm_client.py (Navigator) │   │
│  │                        │                                      │   │
│  │                        ▼                                      │   │
│  │              session_evaluator.py (post-session)              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                            │                                         │
│                            ▼                                         │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                   SQLAlchemy Models                           │   │
│  │  Student │ Session │ Message │ SessionSummary │ SafetyIncident│   │
│  │                     │ CPSIndicator                              │   │
│  │  JSONB columns: messages.llm_metadata, sessions.evaluation_data│   │
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
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py              # Auth and DB dependency injection
│   │   │   └── routes/
│   │   │       ├── auth.py          # Login, get current user
│   │   │       ├── sessions.py      # Create sessions, chat endpoint
│   │   │       ├── stages.py        # Stage registry endpoint
│   │   │       ├── admin.py         # Admin user/session management
│   │   │       └── health.py        # Health check
│   │   │
│   │   ├── core/
│   │   │   ├── config.py            # Environment configuration
│   │   │   ├── prompts.py           # All LLM prompts and stage definitions
│   │   │   └── security.py          # JWT and password hashing
│   │   │
│   │   ├── models/
│   │   │   ├── student.py           # User model
│   │   │   ├── session.py           # Session with evaluation_data JSONB
│   │   │   ├── message.py           # Message with llm_metadata JSONB
│   │   │   ├── session_summary.py   # Not yet used
│   │   │   └── safety_incident.py   # Not yet used
│   │   │
│   │   ├── schemas/
│   │   │   ├── auth.py
│   │   │   ├── student.py
│   │   │   ├── session.py
│   │   │   ├── message.py
│   │   │   └── llm.py               # LLM response validation
│   │   │
│   │   ├── services/
│   │   │   ├── flow_engine.py       # Stage logic and LLM orchestration
│   │   │   ├── llm_client.py        # LLM client (UF Navigator / any OpenAI-compatible API)
│   │   │   └── session_evaluator.py # Post-session evaluation
│   │   │
│   │   └── main.py
│   │
│   ├── alembic/versions/
│   │   ├── 001_initial_schema.py
│   │   ├── 002_add_message_metadata.py
│   │   └── 003_add_session_evaluation.py
│   │
│   ├── tests/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── seed_admin.py
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── login/page.tsx
│   │   │   ├── chat/page.tsx        # Legacy chat page
│   │   │   └── dashboard/
│   │   │       ├── page.tsx         # Main dashboard with chat
│   │   │       └── [sessionId]/inspect/page.tsx  # Session inspector
│   │   │
│   │   ├── components/
│   │   │   ├── MessageCard.tsx      # Chat bubble with metadata toggle
│   │   │   ├── MetadataPanel.tsx    # LLM metadata display
│   │   │   └── StageProgressBar.tsx # Stage progress visualization
│   │   │
│   │   └── lib/
│   │       ├── api.ts
│   │       └── auth-context.tsx
│   │
│   ├── package.json
│   └── Dockerfile
│
├── infra/
│   ├── docker-compose.yml
│   └── .env
│
└── docs/
    ├── SYSTEM.md
    ├── SETUP.md
    └── TASKS_D1.md
```

---

## Key Components Explained

### FlowEngine

Located in `backend/app/services/flow_engine.py`. This orchestrates each turn of conversation with **hybrid transition logic**:

1. Loads CPS indicators (for observe_dynamics) and cross-session memory
2. Checks time limits — force-jumps to wrap_up if over budget
3. Builds a system prompt from the Prompt Registry using the current stage config
4. Calls the LLM client to get a response
5. Runs the **hybrid transition decision** — the LLM recommends, the engine decides:
   - Never advance before `min_turns`
   - Always advance after `max_turns`
   - Required signal heuristics can override LLM's "NEXT" recommendation
6. Logs a full `transition_decision` audit trail in llm_metadata

### Prompt Registry

Located in `backend/app/core/prompts.py`. Single source of truth for all LLM instructions:

- **SYSTEM_PREAMBLE**: Teamwork-focused near-peer persona for high school students
- **RESPONSE_FORMAT_INSTRUCTION**: JSON contract with CPS-aware reflection_data
- **STAGE_REGISTRY**: 6 ELT-mapped stages with min/max turns and required signals
- **SESSION_EVALUATION_PROMPT**: ELT quality assessment + CPS complaint analysis
- **build_cps_context()**: Dynamic CPS indicator injection from database
- **build_system_prompt()**: Assembles persona + stage + CPS + memory + format

### LLM Client

Located in `backend/app/services/llm_client.py`. Wraps LLM API calls (via UF Navigator) with:

- JSON mode to ensure structured responses
- Retry logic with exponential backoff
- Fallback to echo response if all retries fail
- LLMResult object with token usage, response time, and attempt count

### Session Evaluator

Located in `backend/app/services/session_evaluator.py`. Runs one LLM call after a session completes to produce:

- Overall quality score with justification
- **ELT assessment**: Quality rating for each phase of Kolb's cycle
- Student profile with teamwork patterns, communication style, and memory hooks
- **CPS complaint analysis**: Maps student observations to CPS framework indicators
- Tutor performance analysis (including teamwork focus and acknowledge-and-pivot quality)
- Recommendations for future sessions

### The 6 Conversation Stages (ELT-Mapped)

```
1. welcome             — Build rapport, learn who they are
2. recall_experience   — Concrete Experience: what happened in the team meeting
3. observe_dynamics    — Reflective Observation: what team dynamics they noticed (+ CPS probing)
4. make_meaning        — Abstract Conceptualization: why those dynamics occurred
5. plan_experiment     — Active Experimentation: what they'll try differently next meeting
6. wrap_up             — Summarize through ELT lens and close
```

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
| Student | students | Users, both students and admins | Used |
| Session | sessions | Chat session with stage tracking and evaluation_data | Used |
| Message | messages | Individual messages with llm_metadata | Used |
| CPSIndicator | cps_indicators | CPS framework behavioral indicators | Used |
| SessionSummary | session_summaries | ELT-enriched structured extraction | Not used yet |
| SafetyIncident | safety_incidents | Flagged concerning messages | Not used yet |

---

## What's Next

These are the logical next steps:

1. **Safety monitoring** — Run a parallel check on each student message to detect concerning content. The database table exists, needs detection logic.

2. **Session summaries** — Auto-generate a coach-readable summary after each session. The table exists with ELT columns, needs a second post-session LLM call.

3. **Admin dashboard** — Build a proper admin interface for viewing all sessions, managing CPS indicators visually, and reading evaluations.

4. **CPS indicator analytics** — Aggregate CPS observations across sessions to identify team-level patterns.

5. **Multi-model support** — Add Claude or other providers. The LLM client already accepts a model parameter.

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
