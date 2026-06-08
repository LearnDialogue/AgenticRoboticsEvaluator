# 🗺️ D2 ROADMAP — LLM Integration

> **Status**: ✅ COMPLETE  
> **Started**: 2026-02-16  
> **Completed**: 2026-06-08  
> **Goal**: Replace hardcoded template responses with real LLM-powered conversations.  
> **Model**: Llama 3.3 70B via UF Navigator (upgradeable via config)  
> **Constraint**: No LangChain. Custom deterministic FlowEngine stays in control.

---

## Legend

- ⬜ Not started  
- 🔄 In progress  
- ✅ Completed  
- 🔀 Decision point (needs a choice before proceeding)  

---

## Step 0–6 — All Complete ✅

See previous version of this file for full D2 task breakdown. All steps (API plumbing, LLM schema, prompt registry, LLM client, database metadata, FlowEngine transplant, E2E validation) completed.

---

*D2 completed: 2026-06-08*

---
---

# 🗺️ D3 ROADMAP — Teamwork-Focused ELT/CPS Redesign

> **Status**: ✅ COMPLETE  
> **Started**: 2026-06-08  
> **Completed**: 2026-06-08  
> **Goal**: Transform the agent from a generic robotics reflection tool into a teamwork-focused metacognitive reflection agent grounded in Experiential Learning Theory (ELT) and Collaborative Problem Solving (CPS).  
> **Model**: Llama 3.3 70B via UF Navigator  
> **Constraint**: Rule-based finite state model using LLM generation exclusively for natural dialogue.

---

## Phase 1 — CPS Framework Database Layer ✅

| # | Task | File(s) | Status |
|---|------|---------|--------|
| 1.1 | Create `CPSIndicator` SQLAlchemy model | `backend/app/models/cps_indicator.py` | ✅ |
| 1.2 | Create Alembic migration 004 (cps_indicators table) | `backend/alembic/versions/004_*.py` | ✅ |
| 1.3 | Add ELT columns to session_summary (migration 005) | `backend/alembic/versions/005_*.py` | ✅ |
| 1.4 | Create Pydantic schemas for CPS CRUD | `backend/app/schemas/cps.py` | ✅ |
| 1.5 | Create admin API routes for CPS indicators | `backend/app/api/routes/cps.py` | ✅ |
| 1.6 | Create seed script with full CPS framework | `backend/seed_cps.py` | ✅ |
| 1.7 | Register CPS routes in main.py | `backend/app/main.py` | ✅ |

---

## Phase 2 — Stage Redesign (ELT Mapping) ✅

| # | Task | File(s) | Status |
|---|------|---------|--------|
| 2.1 | Rewrite STAGE_REGISTRY — 7 → 6 ELT-mapped stages | `backend/app/core/prompts.py` | ✅ |
| 2.2 | Add min_turns, max_turns, required_signals per stage | same | ✅ |
| 2.3 | Update STAGE_ORDER to new 6-stage sequence | same | ✅ |
| 2.4 | Update default stage in sessions.py | `backend/app/api/routes/sessions.py` | ✅ |
| 2.5 | Update StageProgressBar.tsx | `frontend/src/components/StageProgressBar.tsx` | ✅ |

**New stages**: welcome → recall_experience → observe_dynamics → make_meaning → plan_experiment → wrap_up

---

## Phase 3 — Prompt Registry Rewrite ✅

| # | Task | File(s) | Status |
|---|------|---------|--------|
| 3.1 | Rewrite SYSTEM_PREAMBLE — teamwork focus, HS tone, acknowledge-and-pivot | `backend/app/core/prompts.py` | ✅ |
| 3.2 | Update RESPONSE_FORMAT_INSTRUCTION — CPS-aware reflection_data | same | ✅ |
| 3.3 | Add build_cps_context() for dynamic CPS injection | same | ✅ |
| 3.4 | Update build_system_prompt() — cps_context, cross_session_context | same | ✅ |
| 3.5 | Rewrite SESSION_EVALUATION_PROMPT — ELT assessment, teamwork focus | same | ✅ |

---

## Phase 4 — FlowEngine Hardening (Hybrid Transitions) ✅

| # | Task | File(s) | Status |
|---|------|---------|--------|
| 4.1 | Add _should_advance() with hybrid logic | `backend/app/services/flow_engine.py` | ✅ |
| 4.2 | Add _check_required_signals() — keyword heuristics | same | ✅ |
| 4.3 | Add transition_decision audit trail to llm_metadata | same | ✅ |
| 4.4 | Add db parameter for CPS context injection | same | ✅ |

**Decision matrix**: min_turns → max_turns → LLM STAY → LLM NEXT + signals → override

---

## Phase 5 — Passive Cross-Session Memory ✅

| # | Task | File(s) | Status |
|---|------|---------|--------|
| 5.1 | Add _load_cross_session_context() to FlowEngine | `backend/app/services/flow_engine.py` | ✅ |
| 5.2 | Wire cross_session_context into build_system_prompt() | same | ✅ |
| 5.3 | Pass db to FlowEngine in sessions.py (both routes) | `backend/app/api/routes/sessions.py` | ✅ |

**Behavior**: Only reference previous session context if student brings it up first.

---

## Phase 6 — Time-Bounded Sessions ✅

| # | Task | File(s) | Status |
|---|------|---------|--------|
| 6.1 | Add SESSION_TIME_LIMIT_SECONDS / SESSION_WRAP_UP_THRESHOLD | `backend/app/core/config.py` | ✅ |
| 6.2 | Add _check_time_limit() to FlowEngine | `backend/app/services/flow_engine.py` | ✅ |
| 6.3 | Force jump to wrap_up when time exceeded | same | ✅ |
| 6.4 | Time-awareness hint at 70% threshold | same | ✅ |
| 6.5 | Add time_info to llm_metadata | same | ✅ |

---

## Phase 7 — Documentation ✅

| # | Task | File(s) | Status |
|---|------|---------|--------|
| 7.1 | Update README.md | `README.md` | ✅ |
| 7.2 | Update ROADMAP.md (this file) | `ROADMAP.md` | ✅ |

---

## Files Changed/Created in D3

| File | Action | Phase |
|------|--------|-------|
| `backend/app/models/cps_indicator.py` | **New** | 1 |
| `backend/app/schemas/cps.py` | **New** | 1 |
| `backend/app/api/routes/cps.py` | **New** | 1 |
| `backend/seed_cps.py` | **New** | 1 |
| `backend/alembic/versions/004_*.py` | **New** | 1 |
| `backend/alembic/versions/005_*.py` | **New** | 1 |
| `backend/app/main.py` | Modified | 1 |
| `backend/app/core/prompts.py` | **Rewritten** | 2, 3 |
| `backend/app/services/flow_engine.py` | **Rewritten** | 4, 5, 6 |
| `backend/app/api/routes/sessions.py` | Modified | 2, 5 |
| `backend/app/core/config.py` | Modified | 6 |
| `frontend/src/components/StageProgressBar.tsx` | Modified | 2 |
| `README.md` | Modified | 7 |
| `ROADMAP.md` | Modified | 7 |

---

*D3 completed: 2026-06-08*
