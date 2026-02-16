# 🗺️ D2 ROADMAP — LLM Integration

> **Status**: IN PROGRESS  
> **Started**: 2026-02-16  
> **Goal**: Replace hardcoded template responses with real LLM-powered conversations.  
> **Model**: GPT-4o-mini (upgradeable via config)  
> **Constraint**: No LangChain. Custom deterministic FlowEngine stays in control.

---

## Legend

- ⬜ Not started  
- 🔄 In progress  
- ✅ Completed  
- 🔀 Decision point (needs a choice before proceeding)  

---

## Step 0 — API Key Plumbing ✅

> Get the OpenAI key into the app without touching git.

| # | Task | File(s) | Status |
|---|------|---------|--------|
| 0.1 | Create `infra/.env` with `OPENAI_API_KEY` | `infra/.env` | ✅ |
| 0.2 | Create `infra/.env.example` (safe for git) | `infra/.env.example` | ✅ |
| 0.3 | Verify `.gitignore` covers `infra/.env` | `.gitignore` | ✅ |
| 0.4 | Add `OPENAI_API_KEY`, `OPENAI_MODEL`, `LLM_MAX_RETRIES`, `LLM_STAGE_MAX_TURNS` to Settings | `backend/app/core/config.py` | ✅ |
| 0.5 | Pass env vars to backend container via `env_file` + explicit `environment` | `infra/docker-compose.yml` | ✅ |
| 0.6 | Add `openai>=1.14.0` to dependencies | `backend/requirements.txt` | ✅ |

**Verify**: Rebuild container → `settings.OPENAI_API_KEY` prints in logs (then remove the log line).

---

## Step 1 — LLM Response Schema ✅

> Define the *exact* JSON structure the LLM must return on every turn.  
> This is the **contract** between the LLM and the FlowEngine.

| # | Task | File(s) | Status |
|---|------|---------|--------|
| 1.1 | Create `app/schemas/llm.py` | `backend/app/schemas/llm.py` | ✅ |
| 1.2 | Define `RoutingSignal` enum: `NEXT`, `STAY` | same | ✅ |
| 1.3 | Define `LLMTurnResponse` Pydantic model | same | ✅ |
| 1.4 | Write unit test: valid JSON → parses correctly | `backend/tests/test_llm_schema.py` | ✅ |
| 1.5 | Write unit test: bad JSON → ValidationError | same | ✅ |

### Schema fields

```
LLMTurnResponse:
  student_text:      str       # The conversational response to show the student
  stage_completed:   bool      # Has the student satisfied this stage's goal?
  routing_signal:    Enum      # NEXT | STAY (later: PREVIOUS, JUMP_TO)
  reflection_data:   dict|None # Research extraction: conflict_detected, emotional_tone, etc.
```

🔀 **Decision**: `reflection_data` — free-form `dict` or a stricter sub-model?  
→ *Current decision*: `Optional[dict]` (free-form). We'll tighten it when we know what fields matter for research.

**Verify**: `from app.schemas.llm import LLMTurnResponse` works; Pydantic validates/rejects correctly.

---

## Step 2 — Prompt Registry ✅

> Move all conversational knowledge out of `flow_engine.py` into a single source of truth.

| # | Task | File(s) | Status |
|---|------|---------|--------|
| 2.1 | Create `app/core/prompts.py` | `backend/app/core/prompts.py` | ✅ |
| 2.2 | Define `SYSTEM_PREAMBLE` — the agent's base persona | same | ✅ |
| 2.3 | Define `STAGE_REGISTRY` dict: `stage_id → StageConfig` | same | ✅ |
| 2.4 | Define `RESPONSE_FORMAT_INSTRUCTION` — JSON schema instructions appended to every prompt | same | ✅ |
| 2.5 | Write `build_system_prompt(stage_id, student_name)` → full system prompt string | same | ✅ |
| 2.6 | Review/iterate on prompt text quality | same | ✅ |

### STAGE_REGISTRY shape (per stage)

```python
"greeting": {
    "system_prompt": "Your goal is to warmly greet the student...",
    "goal": "Learn the student's name and build rapport",
    "completion_criteria": "Student has introduced themselves and their project",
    "max_turns": 3,          # safety valve (override: config.LLM_STAGE_MAX_TURNS)
    "next_stage": "context_gathering",
    "stage_number": 1,
}
```

### Persona: "Near-Peer"

The system preamble must establish:
- You are a near-peer tutor, not an authority figure
- You ask questions, you don't lecture
- You acknowledge feelings before redirecting to problem-solving
- You NEVER provide direct answers to technical questions — you reflect them back
- You respond ONLY in the JSON format specified

🔀 **Decision**: Should `max_turns` per stage be in the registry or a global config?  
→ *Current decision*: Registry per-stage (with `config.LLM_STAGE_MAX_TURNS` as the global fallback/override).

🔀 **Decision**: Should we inject `student.tone_pref` and `student.pronouns` into the system prompt?  
→ *Current decision*: Yes, in `build_system_prompt()`. These already exist in the Student model.

**Verify**: `build_system_prompt("greeting", "Aman")` returns a readable, well-structured system prompt string.

---

## Step 3 — LLM Client ✅

> A thin, testable wrapper around the OpenAI API that returns validated Pydantic objects.

| # | Task | File(s) | Status |
|---|------|---------|--------|
| 3.1 | Create `app/services/llm_client.py` | `backend/app/services/llm_client.py` | ✅ |
| 3.2 | Define `LLMClient` Protocol (abstract interface) | same | ✅ |
| 3.3 | Implement `OpenAIClient(LLMClient)` | same | ✅ |
| 3.4 | Implement JSON parsing + Pydantic validation | same | ✅ |
| 3.5 | Implement retry logic (bad JSON → repair prompt → retry) | same | ✅ |
| 3.6 | Implement fallback (all retries fail → safe template response) | same | ✅ |
| 3.7 | Add `get_llm_client()` factory function | same | ✅ |
| 3.8 | Write integration test: real API call → valid `LLMTurnResponse` | `backend/tests/test_llm_client.py` | ✅ |

### Call flow

```
generate_response(messages, system_prompt, stage_id)
  ├─ Attempt 1: OpenAI chat completion (JSON mode)
  │   ├─ Parse JSON → Pydantic LLMTurnResponse ──→ return ✅
  │   └─ Parse fails → Attempt 2
  ├─ Attempt 2: Re-send with repair instruction
  │   ├─ Parse → return ✅
  │   └─ Parse fails → Attempt 3 (fallback)
  └─ Attempt 3: Return DETERMINISTIC fallback
      └─ Uses D1 template strings (app never crashes) ✅
```

### Provider abstraction

```python
class LLMClient(Protocol):
    async def generate_response(
        self,
        messages: list[dict],
        system_prompt: str,
        stage_id: str,
    ) -> LLMTurnResponse: ...

class OpenAIClient:       # ← implement now
    ...

class AnthropicClient:    # ← implement later, same interface
    ...
```

🔀 **Decision**: Sync or async OpenAI client?  
→ *Current decision*: **Async** (`openai.AsyncOpenAI`). FastAPI is async, we should stay non-blocking.

🔀 **Decision**: Use OpenAI's `response_format: {"type": "json_object"}` or function calling?  
→ *Current decision*: `json_object` mode. Simpler, works across providers, and we validate with Pydantic ourselves.

**Verify**: Call `client.generate_response(...)` with a test prompt → get a valid `LLMTurnResponse` back.

---

## Step 4 — Database: Add `llm_metadata` Column ✅

> Store `routing_signal` and `reflection_data` alongside each message for research auditability.

| # | Task | File(s) | Status |
|---|------|---------|--------|
| 4.1 | Add `llm_metadata` column (JSONB, nullable) to `Message` model | `backend/app/models/message.py` | ✅ |
| 4.2 | Create Alembic migration `002_add_message_metadata` | `backend/alembic/versions/002_*.py` | ✅ |
| 4.3 | Run migration, verify column exists | — | ✅ |

### What goes in `metadata`

```json
{
  "routing_signal": "NEXT",
  "stage_completed": true,
  "reflection_data": {
    "emotional_tone": "frustrated",
    "conflict_detected": false
  },
  "model": "gpt-4o-mini",
  "prompt_version": "v1"
}
```

This is **never shown to the user**. It's our research audit trail.

🔀 **Decision**: Separate `llm_audit_log` table vs JSONB column on messages?  
→ *Current decision*: JSONB column. Simpler, colocated, and we can always extract to a table later.

**Verify**: `alembic upgrade head` succeeds. `SELECT metadata FROM messages LIMIT 1` returns NULL for existing rows.

---

## Step 5 — FlowEngine Transplant ⬜

> The big one: rewire `flow_engine.py` to use real LLM responses.

| # | Task | File(s) | Status |
|---|------|---------|--------|
| 5.1 | Remove `STAGES` dict and `_generate_in_stage_response()` | `backend/app/services/flow_engine.py` | ⬜ |
| 5.2 | Import `LLMClient`, `PromptRegistry`, `LLMTurnResponse` | same | ⬜ |
| 5.3 | Inject `LLMClient` into FlowEngine constructor | same | ⬜ |
| 5.4 | Implement `_build_message_history()` (Summary + last N verbatim) | same | ⬜ |
| 5.5 | Rewrite `process()` to call LLM and interpret response | same | ⬜ |
| 5.6 | Add max-turns safety valve (force-advance after N turns) | same | ⬜ |
| 5.7 | Return `metadata` dict from `process()` for the route to save | same | ⬜ |
| 5.8 | Update `sessions.py` route to pass metadata + save to DB | `backend/app/api/routes/sessions.py` | ⬜ |
| 5.9 | Keep `STAGE_ORDER` list for reference | `backend/app/services/flow_engine.py` | ⬜ |

### New `process()` flow

```
process(user_input) → (response_text, new_stage, is_complete, metadata)
    1. Fetch system prompt via build_system_prompt(stage_id, student_name)
    2. Build message history via _build_message_history()
    3. Call llm_client.generate_response(messages, system_prompt, stage_id)
    4. Check stage_completed → if True, advance to next stage
    5. Check max_turns safety valve → force-advance if exceeded
    6. Return (student_text, new_stage, is_complete, raw_metadata)
```

### Message history strategy

```
_build_message_history():
    if len(history) <= 10:
        return full history as-is
    else:
        return [summary of messages 0..N-6] + [last 6 messages verbatim]
```

🔀 **Decision**: How many recent messages to keep verbatim?  
→ *Current decision*: Last 6 (3 turns of user+assistant). Enough for conversational coherence.

🔀 **Decision**: How to generate the summary of older messages?  
→ *Current decision*: For now, simple concatenation/truncation (not an LLM summary call). We'll add LLM-based summarization later if context windows become a concern. With GPT-4o-mini's 128K context and ~35 messages per session max, we likely won't need it.

**Verify**: Chat through all 7 stages in the UI. Responses are contextual, stage transitions happen naturally, metadata is logged to DB.

---

## Step 6 — End-to-End Validation ⬜

> Smoke test everything works together.

| # | Task | Status |
|---|------|--------|
| 6.1 | `docker compose up --build` succeeds | ⬜ |
| 6.2 | Login as admin/admin123 | ⬜ |
| 6.3 | Start a new session | ⬜ |
| 6.4 | Chat through all 7 stages → responses are LLM-generated, not templates | ⬜ |
| 6.5 | Session completes gracefully at wrap_up | ⬜ |
| 6.6 | Query DB: `messages.metadata` has routing_signal + reflection_data | ⬜ |
| 6.7 | Test fallback: temporarily set invalid API key → app still works (template fallback) | ⬜ |
| 6.8 | Commit + push | ⬜ |

---

## Future Work (NOT in this roadmap, but designed for)

These are things the architecture explicitly supports but we are NOT building yet:

| Feature | How the architecture supports it |
|---------|----------------------------------|
| **Non-linear routing** (PREVIOUS, JUMP_TO) | `RoutingSignal` enum — just add variants + FlowEngine logic |
| **Cross-session memory** ("picks up on important things") | Query past session summaries → inject into system prompt preamble |
| **LLM-based message summarization** | Swap `_build_message_history()` strategy — interface stays the same |
| **Anthropic / local model support** | Implement `AnthropicClient(LLMClient)` — FlowEngine unchanged |
| **Safety incident detection** | Read `reflection_data.conflict_detected` from metadata → create SafetyIncident |
| **Session summary generation** | After session completes → LLM call → write to SessionSummary table |
| **Prompt A/B testing** | `prompt_version` field in metadata → compare response quality |
| **Adaptive tone** | `student.tone_pref` already injected into system prompt |

---

## Files Changed/Created in D2

| File | Action | Step |
|------|--------|------|
| `infra/.env` | Created | 0 |
| `infra/.env.example` | Created | 0 |
| `backend/app/core/config.py` | Modified | 0 |
| `backend/requirements.txt` | Modified | 0 |
| `infra/docker-compose.yml` | Modified | 0 |
| `backend/app/schemas/llm.py` | **New** | 1 |
| `backend/tests/test_llm_schema.py` | **New** | 1 |
| `backend/app/core/prompts.py` | **New** | 2 |
| `backend/app/services/llm_client.py` | **New** | 3 |
| `backend/tests/test_llm_client.py` | **New** | 3 |
| `backend/app/models/message.py` | Modified | 4 |
| `backend/alembic/versions/002_*.py` | **New** | 4 |
| `backend/app/services/flow_engine.py` | **Rewritten** | 5 |
| `backend/app/api/routes/sessions.py` | Modified | 5 |

---

*Last updated: 2026-02-16*
