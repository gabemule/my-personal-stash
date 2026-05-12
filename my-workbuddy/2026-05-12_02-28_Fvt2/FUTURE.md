# FUTURE.md — Roadmap

Features planned for future iterations, out of scope for the current implementation.

## Backlog

### LLM
- **LLM adapter V2:** Migrate from `@anthropic-ai/claude-code` to `@anthropic-ai/sdk` directly — more control, no dependency on Claude Code CLI
- **Other LLM providers:** OpenAI (GPT-4), Ollama (local models)
- **Semantic search:** Embeddings-based search across wiki pages (vector DB)

### Ingest
- **Batch ingest:** Process multiple raw files in a single operation
- **Auto-lint:** Scheduled wiki health check (cron-like, runs on startup or on demand)
- **TTL for transcriptions:** Auto-archive transcriptions older than 3 months

### UI
- **Wiki graph view:** Visual graph of page relationships
- **Diff view:** Show what changed between wiki versions
- **Mobile-friendly layout:** Responsive design for tablet/phone use

### Infrastructure
- **Remote deploy:** Multi-user support, hosted version
- **Export:** Export wiki to PDF, Notion, Confluence
- **Backup:** Automated backup to S3 or similar
