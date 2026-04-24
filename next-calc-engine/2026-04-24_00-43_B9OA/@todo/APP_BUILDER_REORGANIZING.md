# App Builder — Reorganização em seções + extração de modais

> Plano **self-contained** para reorganizar `app/builder/` em seções co-locadas (LeftSidebar / MainContent / RightSidebar), extrair os modais do shell e alinhar a convenção de pastas do App Router (`_components/`).
>
> **Escopo isolado:** só mexe em `app/builder/`. Nenhuma rota irmã (`app/calc/`, `app/engines/`, `app/projects/`, `app/guide/`) é tocada. Nenhum código `core/`, `lib/`, `hooks/`, `stores/`, `components/` é tocado.

---

## Sumário

- [Context](#context)
- [Goals](#goals)
- [Escopo](#escopo)
- [Estrutura alvo](#estrutura-alvo)
- [Convenção de pastas: Escola A (underscore só onde obriga)](#convenção-de-pastas-escola-a-underscore-só-onde-obriga)
- [Co-location por seção](#co-location-por-seção)
- [Fases de execução](#fases-de-execução)
- [Critérios de sucesso globais](#critérios-de-sucesso-globais)
- [Anti-escopo](#anti-escopo)
- [Progresso](#progresso)
- [Changelog](#changelog)

---

## Context

**Hoje.** `app/builder/_components/EngineBuilder/index.tsx` — na verdade `app/builder/components/EngineBuilder/index.tsx` no estado atual — concentra **~350 linhas** misturando 4 responsabilidades distintas:

1. **Shell** — montagem do layout 3-colunas com `grid-template-columns: 300px 1fr 320px`.
2. **Header toolbar** — nome do engine, dirty indicator, botões Salvar/Importar/Limpar/Config, save toast.
3. **4 modais inline** — Config, Import JSON (com file loader + textarea), Version conflict, Clear confirm.
4. **Lógica de orquestração** — handlers `handleSave`, `handleSaveVersion`, `handleImport`, `handleCalculate`, effect inicial de `loadFromAPI`, estados locais (`openPanel`, `configOpen`, `saveToast`, `versionModal`, `versionName`, `savedSnapshot`, `initialized`, `selectedRecord`, `isNewEngine`, `refreshKey`).

Consequência: file sweet spot violado, leitura difícil, mudança em qualquer um dos 4 eixos força tocar o arquivo monolítico.

**Estrutura atual** (`app/builder/components/` — sem underscore):

```
app/builder/components/
├── BuilderHeader/
├── ConfigPanel/
├── EngineBuilder/          ← 350 linhas, shell monolítico
├── JsonPreview/
├── LookupTablesPanel/
├── StepCard/
├── TableEditModal/
├── TestPanel/
└── VariablesPanel/
```

Três dívidas secundárias:

- **`components/` sem underscore** — todas as outras rotas (e a convenção oficial do Next.js 16 App Router) usam `_components/` para sinalizar "pasta privada, não vira rota". `app/builder/` é a única out-of-convention.
- **Flat hierarchy** — nenhum agrupamento por propósito. `TableEditModal` (usado SÓ por `LookupTablesPanel`) fica ao lado de `StepCard` (que nem conhece tabelas).
- **`ConfigPanel` órfão** — existe só para ser embrulhado pelo modal inline. Não faz sentido viver separado.

**Grep de cross-imports** confirmou que **nenhum** building block é compartilhado entre seções: cada componente pertence a exatamente uma coluna do layout ou a um modal específico. Co-location é puro ganho, zero trade-off.

## Goals

Ao final deste plano:

1. **`EngineBuilder/index.tsx` ≤ 120 linhas** — só hooks, handlers cross-section e composição declarativa das seções/modais.
2. **3 wrappers de seção** (`LeftSidebar`, `MainContent`, `RightSidebar`) com props tipados, cada um encapsulando layout + building blocks + micro-state da coluna (ex.: `openPanel` fica dentro de `RightSidebar`).
3. **4 modais extraídos** (`ConfigModal`, `ImportModal`, `VersionModal`, `ClearConfirmModal`) — cada um com props `open` + `onClose` + dados/handlers específicos.
4. **Co-location** — building block vive dentro da pasta da seção/modal que o usa.
5. **Convenção `_components/`** alinhada com o resto do projeto (underscore apenas no nível onde é tecnicamente obrigatório).
6. **Zero regressão** visual ou funcional — smoke test manual em todos os fluxos existentes.

## Escopo

**Dentro:**
- Rename `app/builder/components/` → `app/builder/_components/`.
- Mover building blocks para dentro de `sections/<Section>/components/` e `modals/<Modal>/components/`.
- Criar `sections/LeftSidebar/index.tsx`, `sections/MainContent/index.tsx`, `sections/RightSidebar/index.tsx`.
- Criar `modals/ConfigModal/index.tsx`, `modals/ImportModal/index.tsx`, `modals/VersionModal/index.tsx`, `modals/ClearConfirmModal/index.tsx`.
- Enxugar `EngineBuilder/index.tsx`.
- Atualizar imports em `app/builder/page.tsx` e imports internos.

**Fora:**
- Refatorar conteúdo de `VariablesPanel`, `LookupTablesPanel`, `StepCard`, `TestPanel`, `JsonPreview`, `BuilderHeader`, `ConfigPanel`, `TableEditModal` — só rename/move da pasta pai.
- Qualquer mudança em outras rotas.
- Criar componentes genéricos reutilizáveis de "Sidebar", "ColumnHeader" etc. — YAGNI, só o builder tem esse layout.
- Mexer em `@/components/Modal` (global) — o building block genérico continua onde está.
- Mexer em `@/core/export`, `@/core/runner` ou qualquer coisa fora de `app/builder/`.

## Estrutura alvo

```
app/builder/
├── page.tsx                          ← intocado (já é trivial)
├── loading.tsx                       ← intocado
└── _components/                      ← único underscore (private folder obrigatória)
    ├── EngineBuilder/
    │   └── index.tsx                 ← shell ≤ 120 linhas
    ├── BuilderHeader/
    │   └── index.tsx                 ← rename da pasta pai, conteúdo intacto
    ├── sections/
    │   ├── LeftSidebar/
    │   │   ├── index.tsx             ← wrapper fino
    │   │   └── components/
    │   │       ├── VariablesPanel/
    │   │       ├── LookupTablesPanel/
    │   │       └── TableEditModal/   ← co-locado: usado só por LookupTablesPanel
    │   ├── MainContent/
    │   │   ├── index.tsx             ← lista de StepCard + botões "+ Etapa"
    │   │   └── components/
    │   │       └── StepCard/
    │   └── RightSidebar/
    │       ├── index.tsx             ← encapsula state do `openPanel` ("test" | "json")
    │       └── components/
    │           ├── TestPanel/
    │           └── JsonPreview/
    └── modals/
        ├── ConfigModal/
        │   ├── index.tsx             ← wrapper Modal + ConfigPanel
        │   └── components/
        │       └── ConfigPanel/      ← co-locado: usado só pelo ConfigModal
        ├── ImportModal/
        │   └── index.tsx             ← file loader + textarea + handleImport
        ├── VersionModal/
        │   └── index.tsx             ← nome conflitando + sugestão de `v2`
        └── ClearConfirmModal/
            └── index.tsx             ← confirmação de limpar tudo
```

### O que fica onde (mapa detalhado)

| Componente/arquivo atual | Destino |
|---|---|
| `components/EngineBuilder/index.tsx` | `_components/EngineBuilder/index.tsx` (enxugado) |
| `components/BuilderHeader/index.tsx` | `_components/BuilderHeader/index.tsx` |
| `components/VariablesPanel/index.tsx` | `_components/sections/LeftSidebar/components/VariablesPanel/index.tsx` |
| `components/LookupTablesPanel/index.tsx` | `_components/sections/LeftSidebar/components/LookupTablesPanel/index.tsx` |
| `components/TableEditModal/*` | `_components/sections/LeftSidebar/components/TableEditModal/*` |
| `components/StepCard/index.tsx` | `_components/sections/MainContent/components/StepCard/index.tsx` |
| `components/TestPanel/index.tsx` | `_components/sections/RightSidebar/components/TestPanel/index.tsx` |
| `components/JsonPreview/index.tsx` | `_components/sections/RightSidebar/components/JsonPreview/index.tsx` |
| `components/ConfigPanel/index.tsx` | `_components/modals/ConfigModal/components/ConfigPanel/index.tsx` |
| *(novo)* `LeftSidebar/index.tsx` | wrapper |
| *(novo)* `MainContent/index.tsx` | wrapper |
| *(novo)* `RightSidebar/index.tsx` | wrapper |
| *(novo)* `ConfigModal/index.tsx` | extraído do shell |
| *(novo)* `ImportModal/index.tsx` | extraído do shell |
| *(novo)* `VersionModal/index.tsx` | extraído do shell |
| *(novo)* `ClearConfirmModal/index.tsx` | extraído do shell |

## Convenção de pastas: Escola A (underscore só onde obriga)

Private folders (`_prefix`) do App Router existem por um motivo único: impedir que o Next.js crie rotas automáticas. A regra é **hierárquica**: uma vez que a raiz da árvore é private, Next para de olhar para baixo. Logo:

- `app/builder/_components/` → underscore **obrigatório** (senão `/builder/components` vira rota).
- `app/builder/_components/sections/` → underscore **desnecessário**.
- `app/builder/_components/sections/LeftSidebar/components/` → idem, desnecessário.

Adotada **Escola A**: underscore **apenas** no nível tecnicamente obrigatório. Racional:

- Underscore carrega significado técnico. Usar fora do seu papel vira ruído visual.
- Aninhamento dentro de `_components/` já é suficientemente claro como "escopo interno".
- Consistência com convenção idiomática do Next.js (docs oficiais não adicionam `_` redundantes).

## Co-location por seção

Cada seção é **self-contained**: recebe props, renderiza sua UI, gerencia seu micro-state local quando fizer sentido. Se um dia precisarmos deletar/mover/reescrever uma seção, a pasta é uma unidade coesa.

**Regra:** um building block usado por **exatamente uma** seção/modal vive **dentro** dela. Nenhum é compartilhado hoje (verificado por grep), então regra dispara para todos.

### Props sugeridas (referência para implementação)

Estes são os contratos mínimos — ajustar se a implementação revelar props extras. Nomes de props **devem** seguir o padrão atual (`dispatch`, `engine`, `ui`, etc.).

```ts
// LeftSidebar
interface LeftSidebarProps {
  engine: EngineState
  dispatch: Dispatch<EngineAction>
}

// MainContent
interface MainContentProps {
  engine: EngineState
  ui: UIState
  dispatch: Dispatch<EngineAction>
}

// RightSidebar — encapsula state local do `openPanel`
interface RightSidebarProps {
  engine: EngineState
  ui: UIState
  dispatch: Dispatch<EngineAction>
  exported: ExportedState
  onCalculate: () => void
}

// ConfigModal
interface ConfigModalProps {
  open: boolean
  onClose: () => void
  config: EngineConfig
  dispatch: Dispatch<EngineAction>
}

// ImportModal
interface ImportModalProps {
  open: boolean
  onClose: () => void
  onImport: (json: string) => void   // shell injeta handleImport
}

// VersionModal
interface VersionModalProps {
  open: boolean
  onClose: () => void
  engineName: string                  // pra mostrar "já existe nome X"
  suggestedName: string
  onConfirm: (name: string) => void   // shell injeta handleSaveVersion
}

// ClearConfirmModal
interface ClearConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void               // shell injeta reset handler
}
```

**Nota sobre `RightSidebar`:** o state local `openPanel` (`"test" | "json"`) só importa dentro desta coluna. Move pra lá. Shell não precisa saber qual painel está aberto.

## Fases de execução

Cada fase = 1 commit reviewable. `yarn tsc --noEmit` deve passar ao final de cada fase.

### Fase 1 — Rename + co-location inicial (~45min)

**Objetivo:** mover todos os building blocks para seus destinos finais, sem ainda criar wrappers ou modais. Tudo continua funcional porque o shell passa a importar dos novos caminhos.

**Ações:**
1. `git mv app/builder/components app/builder/_components`
2. Criar subárvore de pastas: `_components/sections/{LeftSidebar,MainContent,RightSidebar}/components/`, `_components/modals/{ConfigModal,ImportModal,VersionModal,ClearConfirmModal}/` (só as pastas; arquivos virão na Fase 2 e 3).
3. Mover cada building block conforme o mapa da seção [Estrutura alvo](#estrutura-alvo):
   - `_components/VariablesPanel/` → `_components/sections/LeftSidebar/components/VariablesPanel/`
   - `_components/LookupTablesPanel/` → `_components/sections/LeftSidebar/components/LookupTablesPanel/`
   - `_components/TableEditModal/` → `_components/sections/LeftSidebar/components/TableEditModal/`
   - `_components/StepCard/` → `_components/sections/MainContent/components/StepCard/`
   - `_components/TestPanel/` → `_components/sections/RightSidebar/components/TestPanel/`
   - `_components/JsonPreview/` → `_components/sections/RightSidebar/components/JsonPreview/`
   - `_components/ConfigPanel/` → `_components/modals/ConfigModal/components/ConfigPanel/`
   - `_components/BuilderHeader/` permanece onde está (`_components/BuilderHeader/`).
4. Atualizar imports:
   - `app/builder/page.tsx` → import `./components/EngineBuilder` vira `./_components/EngineBuilder`.
   - `EngineBuilder/index.tsx` — atualizar todos os imports relativos (`../VariablesPanel` → `../sections/LeftSidebar/components/VariablesPanel`, etc.).
   - `LookupTablesPanel/index.tsx` → `../TableEditModal` vira `./TableEditModal` (agora vizinhos na mesma seção).

**Verify:**
- [ ] `yarn tsc --noEmit` verde
- [ ] `yarn dev` inicia sem erro
- [ ] Smoke manual: abrir `/builder`, clicar em todas as 3 colunas, abrir e fechar todos os 4 modais inline
- [ ] `grep -rn "app/builder/components" app/ lib/ core/ components/` retorna zero matches
- [ ] `grep -rn "@/app/builder" app/ lib/ core/ components/` retorna zero matches (nenhum consumer externo)

**Commit:** `refactor(builder): rename components to _components and co-locate by section`

### Fase 2 — Criar wrappers de seção (~1h)

**Objetivo:** extrair os 3 blocos JSX do `EngineBuilder/index.tsx` (sidebar esquerda, main, sidebar direita) para componentes próprios. Shell passa a compor 3 seções em vez de renderizar o grid inteiro.

**Ações:**
1. Criar `_components/sections/LeftSidebar/index.tsx`:
   - Recebe `{ engine, dispatch }`.
   - Renderiza `<aside>` com `VariablesPanel` + `LookupTablesPanel`.
   - Import relativo: `./components/VariablesPanel`, `./components/LookupTablesPanel`.
2. Criar `_components/sections/MainContent/index.tsx`:
   - Recebe `{ engine, ui, dispatch }`.
   - Renderiza `<main>` com header "Etapas de Cálculo", empty state, lista de `StepCard`, separadores com botão `+ etapa`, botão final `+ Etapa`.
   - Import: `./components/StepCard`.
3. Criar `_components/sections/RightSidebar/index.tsx`:
   - Recebe `{ engine, ui, dispatch, exported, onCalculate }`.
   - **Move pra cá** o `useState<"test" | "json">("test")` (estado local dessa coluna).
   - Renderiza `<aside>` com `TestPanel` + `JsonPreview`.
4. Atualizar `EngineBuilder/index.tsx`:
   - Remover os 3 blocos JSX inline.
   - Remover `useState(openPanel)`.
   - Remover imports de `VariablesPanel`, `LookupTablesPanel`, `StepCard`, `TestPanel`, `JsonPreview`.
   - Adicionar imports dos 3 wrappers.
   - Substituir o `<div className="grid ...">` pela composição:
     ```tsx
     <div className="grid flex-1 overflow-hidden" style={{ gridTemplateColumns: "300px 1fr 320px" }}>
       <LeftSidebar engine={engine} dispatch={dispatch} />
       <MainContent engine={engine} ui={ui} dispatch={dispatch} />
       <RightSidebar engine={engine} ui={ui} dispatch={dispatch} exported={exported} onCalculate={handleCalculate} />
     </div>
     ```

**Verify:**
- [ ] `yarn tsc --noEmit` verde
- [ ] Smoke: `/builder` renderiza idêntico visualmente
- [ ] Teste: criar variável, criar tabela, adicionar steps, alternar `TestPanel`/`JsonPreview`, clicar em Calcular → resultados aparecem

**Commit:** `refactor(builder): extract LeftSidebar/MainContent/RightSidebar section wrappers`

### Fase 3 — Extrair modais (~45min)

**Objetivo:** remover os 4 blocos de modal inline do shell e encapsular em componentes próprios.

**Ações:**
1. Criar `_components/modals/ConfigModal/index.tsx`:
   - Props: `{ open, onClose, config, dispatch }`.
   - Renderiza `<Modal title="Configurações" onClose={onClose}><ConfigPanel config={config} dispatch={dispatch} /></Modal>` guardado por `if (!open) return null`.
   - Import relativo: `./components/ConfigPanel`, `@/components/Modal`.
2. Criar `_components/modals/ImportModal/index.tsx`:
   - Props: `{ open, onClose, onImport }`.
   - **Move pra cá** o `useRef<HTMLTextAreaElement>` e `useRef<HTMLInputElement>` do file loader.
   - **Move pra cá** a lógica inline do file reader (`onChange` no input type="file").
   - Quando o usuário clicar "Importar", chama `onImport(textareaValue)` — shell valida e despacha.
   - **Decisão de escopo:** `validateImportedState` + `JSON.parse` + `dispatch IMPORT_STATE` ficam no shell (handler `handleImport`). Modal só emite string.
3. Criar `_components/modals/VersionModal/index.tsx`:
   - Props: `{ open, onClose, engineName, suggestedName, onConfirm }`.
   - **Move pra cá** o `useState(versionName)`.
   - Effect `useEffect(() => setVersionName(suggestedName), [suggestedName])` para inicializar quando abrir.
   - Input + botão "Salvar nova versão" → `onConfirm(versionName.trim())`.
4. Criar `_components/modals/ClearConfirmModal/index.tsx`:
   - Props: `{ open, onClose, onConfirm }`.
   - Renderiza confirmação com botão "Confirmar" (chama `onConfirm` + `onClose`) e "Cancelar".
   - **Nota:** state atual usa `ui.clearConfirmOpen` via dispatch (`OPEN_CLEAR_CONFIRM` / `CLOSE_CLEAR_CONFIRM`). Manter esse padrão — shell passa `open={ui.clearConfirmOpen}`, `onClose={() => dispatch({ type: "CLOSE_CLEAR_CONFIRM" })}`.
5. Atualizar `EngineBuilder/index.tsx`:
   - Remover 4 blocos de `<Modal>` inline + todos os states/refs internos (`importTextRef`, `importFileRef`, `versionName`).
   - Manter `configOpen`, `versionModal` states (controle local do shell).
   - Manter handlers `handleImport`, `handleSaveVersion` (precisam do engine completo, ficam aqui).
   - Adicionar imports dos 4 modais e compor:
     ```tsx
     <ConfigModal open={configOpen} onClose={() => setConfigOpen(false)} config={engine.config} dispatch={dispatch} />
     <ImportModal open={ui.importModalOpen} onClose={() => dispatch({ type: "CLOSE_IMPORT_MODAL" })} onImport={handleImport} />
     <VersionModal open={versionModal} onClose={() => setVersionModal(false)} engineName={engine.name} suggestedName={versionName} onConfirm={handleSaveVersion} />
     <ClearConfirmModal open={ui.clearConfirmOpen} onClose={() => dispatch({ type: "CLOSE_CLEAR_CONFIRM" })} onConfirm={handleClearConfirm} />
     ```
   - Criar `handleClearConfirm` agrupando os 3 dispatches + resets (`setSelectedRecord(null)`, `setSavedSnapshot("")`, `setIsNewEngine(true)`).

**Verify:**
- [ ] `yarn tsc --noEmit` verde
- [ ] Smoke dos 4 modais:
  - Config: abre, edita precision/rounding, fecha, persiste em memória
  - Import JSON: abre, cola JSON válido, importa; cola JSON inválido, alerta aparece; carrega arquivo, conteúdo preenche textarea
  - Version conflict: salvar com nome existente abre modal, sugere `v2`, confirmar salva
  - Clear: confirma e o state é resetado

**Commit:** `refactor(builder): extract Config/Import/Version/ClearConfirm modals from shell`

### Fase 4 — Enxugar o shell (~30min)

**Objetivo:** garantir que `EngineBuilder/index.tsx` está no sweet spot (≤ 120 linhas) e organizado.

**Ações:**
1. Remover quaisquer imports não utilizados (o editor/eslint deve apontar após Fases 2 e 3).
2. Reordenar o arquivo para fluir:
   - Imports
   - Component + hooks (state/effect)
   - Derived values (`useMemo`)
   - Handlers (`useCallback`)
   - Early return para empty states
   - Main render
3. Se sobrar algum bloco JSX grande (ex.: empty state de projetos/engines), extrair também se fizer sentido — mas **não forçar**. Checklist: se tem `> 30 linhas` de JSX inline e `> 2 níveis` de aninhamento condicional, extrai; caso contrário, mantém.
4. Medir: `wc -l app/builder/_components/EngineBuilder/index.tsx`.

**Verify:**
- [ ] `wc -l app/builder/_components/EngineBuilder/index.tsx` ≤ 120
- [ ] `yarn tsc --noEmit` verde
- [ ] Smoke test completo end-to-end:
  - Login → builder → escolher projeto → criar engine novo → adicionar variável → adicionar tabela → adicionar step com expressão → calcular → JSON preview atualiza → salvar → reload → engine permanece → abrir config → editar → fechar → importar JSON → limpar tudo.

**Commit:** `refactor(builder): slim EngineBuilder shell to composition only`

## Critérios de sucesso globais

- [ ] `app/builder/_components/` substitui `app/builder/components/`
- [ ] `EngineBuilder/index.tsx` ≤ 120 linhas
- [ ] 3 wrappers de seção existem e são usados pelo shell
- [ ] 4 modais extraídos e reutilizáveis
- [ ] Nenhum building block duplicado ou órfão
- [ ] `yarn tsc --noEmit` verde
- [ ] `grep -rn "@/app/builder/components" .` retorna zero matches (nenhum consumer externo quebrado)
- [ ] `grep -rn "from \"\\.\\./BuilderHeader\"" app/builder/` retorna um único match vindo do shell (nenhum import stale)
- [ ] Smoke test manual das 3 seções + 4 modais sem regressão visual ou funcional
- [ ] Cada commit de Fase é reviewable isoladamente

## Anti-escopo

Explicitamente **fora** deste plano. Se aparecer tentação, resistir.

- **Refatorar conteúdo** de `VariablesPanel`, `LookupTablesPanel`, `StepCard`, `TestPanel`, `JsonPreview`, `BuilderHeader`, `ConfigPanel`, `TableEditModal`. Só rename da pasta pai + ajuste de imports relativos internos (quando aplicável).
- **Reorganizar rotas irmãs** (`app/calc/`, `app/engines/`, `app/projects/`, `app/guide/`). Cada uma é plano próprio se necessário.
- **Criar componentes genéricos** tipo `<Sidebar>`, `<Column>`, `<Panel>` etc. YAGNI — só o builder tem esse layout.
- **Mexer em `@/components/Modal`**. Continua global e intocado.
- **Mover `stores/`, `hooks/`, `types/` do root** para `app/_*`. Ver histórico desta sessão: decisão explícita de não fazer.
- **Promover `core/export`, `core/runner`** ou reorganizar `core/`, `lib/`, `utils/`, `schemas/`. Intocados.
- **Consolidar loading.tsx duplicados** (item em `@todo/TODO.md`) — plano separado.
- **Trocar state management** do shell (Zustand vs useState vs reducer mix). Se a dor aparecer, plano próprio.
- **Adicionar testes unitários** para os wrappers. Smoke manual é o suficiente pro escopo deste refactor — o projeto hoje não tem infra de testes de componente, e criar isso é outro plano.

## Progresso

- [ ] Fase 1 — Rename + co-location inicial
- [ ] Fase 2 — Criar wrappers de seção
- [ ] Fase 3 — Extrair modais
- [ ] Fase 4 — Enxugar o shell

## Changelog

- **2026-04-21** — Plano criado. Decisões fechadas: co-location por seção (building blocks vivem dentro da pasta da seção/modal que os usa), Escola A para convenção de pastas (underscore apenas no nível tecnicamente obrigatório — `app/builder/_components/` e nada mais abaixo), 4 fases reviewable independentes, zero escopo fora de `app/builder/`.
