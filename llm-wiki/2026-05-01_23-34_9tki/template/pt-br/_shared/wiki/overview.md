---
title: "{{NAME}}"
type: index
tags: [overview]
created: {{DATE}}
updated: {{DATE}}
summary: "Síntese evolutiva do {{NAME}}. Atualizado pelo agente após operações relevantes."
sources: []
references: []
---

# {{NAME}}

**Domínio:** {{DOMAIN}}
**Início:** {{DATE}}

---

## Sobre este oráculo

Este é um **oráculo LLM Wiki** — uma base de conhecimento mantida por
agente (Claude Code) seguindo o padrão descrito por Andrej Karpathy.

- 📥 **Fontes brutas** vão em `raw/` (você as adiciona; agente nunca modifica).
- 📚 **Wiki destilada** vive em `wiki/` (agente mantém; você lê).
- 🧠 **Schema** vive em [`CLAUDE.md`](../CLAUDE.md) (manual do agente).

## Como navegar

- [[index]] — catálogo de tudo
- [[log]] — timeline de operações
- Demais páginas em `wiki/` emergem conforme você ingere fontes
  (`source-*`, `entity-*`, `concept-*`, `analysis-*`).

## Síntese atual

_(esta seção será preenchida pelo agente conforme o oráculo crescer)_

---

## Comandos rápidos

```bash
npm run init                      # inicializar (uma vez por oráculo)
npm run ingest -- raw/<arquivo>   # ingerir fonte
npm run query -- "pergunta"       # perguntar contra a wiki
npm run lint                      # health-check
npm run status                    # diagnóstico rápido (sem chamar LLM)
npm run chat                      # sessão interativa livre
```
