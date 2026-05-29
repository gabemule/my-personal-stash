# FASTAPI-API — Progress

**Status:** 0/5 phases · Phase: Not started
**Blocked by:** DI-REFACTOR (#10)

## Current Focus
Not started — waiting for DI-REFACTOR to complete.
Next step: Begin Phase 1 (project setup & foundation) after DI-REFACTOR is done.
Blocker: DI-REFACTOR (#10) must be complete first — singletons are not thread-safe for concurrent HTTP requests.

## Progress

### Phase 1: Project Setup & Foundation
- [ ] Add `fastapi` + `uvicorn` to dependencies (optional extra)
- [ ] Create `src/api/` package structure
- [ ] Create FastAPI app factory in `app.py`
- [ ] Health check endpoint (`GET /health`)
- [ ] Error handler middleware
- [ ] Console script entry point `context-ai-api`

### Phase 2: CRUD Endpoints
- [ ] `POST /generate` endpoint
- [ ] `GET /collections` endpoint
- [ ] `DELETE /collections/{name}` endpoint
- [ ] `GET /config` + `PUT /config` endpoints
- [ ] `POST /select` endpoint
- [ ] Pydantic request/response schemas

### Phase 3: AI Endpoints with Streaming
- [ ] `POST /query` endpoint (JSON response)
- [ ] `POST /ask` endpoint (SSE stream)
- [ ] `POST /chat` endpoint (SSE stream)
- [ ] SSE streaming adapter for AIService

### Phase 4: Auth & CORS Middleware
- [ ] API key middleware (`X-API-Key` header)
- [ ] CORS middleware (configurable origins)
- [ ] Config entries for API key and CORS

### Phase 5: Documentation & Integration
- [ ] Verify OpenAPI spec completeness
- [ ] Add API usage examples to docs
- [ ] Update VS Code extension to use HTTP API
- [ ] Update ADR-002 status to "Implemented" for FastAPI

## Decisions Made During Execution
(none yet)
