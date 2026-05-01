# Log — {{NAME}}

> Histórico cronológico **append-only** das operações no oráculo.
> Formato: `## [YYYY-MM-DD HH:MM] <op> | <descrição>`
>
> Operações: `init`, `ingest`, `query`, `query|arquivada`, `lint`, `manual`.
>
> Inspeção rápida via shell:
> ```bash
> grep "^## \\[" wiki/log.md | tail -10
> ```

---

<!-- entradas abaixo, mais recentes no fim -->
