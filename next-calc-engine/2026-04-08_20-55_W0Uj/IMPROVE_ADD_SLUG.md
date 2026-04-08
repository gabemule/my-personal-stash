# Adicionar slug em projetos e motores

## Context
Os nomes de projetos e motores podem ter espaços, acentos e caracteres especiais ("Cálculo de Juros", "Financiamento Imobiliário"), tornando-os inutilizáveis como segmentos de URL. A rota `/api/calc/:project/:engine` precisa de um identificador URL-safe controlado pelo usuário: o `slug`.

O slug é definido manualmente no momento da criação — não é gerado automaticamente — para que o usuário tenha controle total sobre a URL de integração.

## Esforço: médio (~2-3h)

## Arquivos alterados

| Arquivo | Ação | Descrição |
|---|---|---|
| `db/schema.sql` | Atualizar | Adicionar coluna `slug` em ambas as tabelas |
| `db/migration_slugs.sql` | Criar | Migração para bancos existentes |
| `app/api/projects/route.ts` | Atualizar | POST aceita e requer `slug` |
| `app/api/engines/route.ts` | Atualizar | POST aceita e requer `slug`; GET aceita `?projectSlug=` |
| `app/api/engines/active/route.ts` | Atualizar | GET aceita `?projectSlug=` |
| `app/api/engines/[id]/route.ts` | Atualizar | PATCH aceita `slug` (editável) |
| `app/api/calc/[...segments]/route.ts` | Atualizar | Busca por `slug` em vez de `name` |
| `stores/engineStore.ts` | Atualizar | Tipos + `createProject(name, slug)` + `saveEngine` com slug |
| `app/projects/components/ProjectsLibrary/index.tsx` | Atualizar | Formulário "Novo Projeto" ganha campo slug |
| `app/builder/components/EngineBuilder/index.tsx` | Atualizar | Modal de primeiro save e versionModal ganham campo slug |

## 1. DB — `db/schema.sql`

```sql
create table projects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text not null unique,             -- ← novo
  is_active  boolean not null default false,
  created_at timestamptz not null default now()
);

create table engines (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null,                   -- ← novo
  engine      jsonb not null,
  is_active   boolean not null default false,
  project_id  uuid references projects(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint engines_name_project_unique unique (name, project_id),
  constraint engines_slug_project_unique unique (slug, project_id)  -- ← novo
);
```

## 2. Migration — `db/migration_slugs.sql`

Para bancos existentes (rodar no SQL Editor do Supabase):

```sql
-- Adiciona colunas temporariamente nullable
alter table projects add column slug text unique;
alter table engines  add column slug text;

-- Backfill: usa o name como slug base (serão inválidos se tiverem acentos, mas é um ponto de partida)
-- O usuário deve editar os slugs inválidos após a migração via UI ou SQL
update projects set slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'));
update engines  set slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'));

-- Torna não-nullable após o backfill
alter table projects alter column slug set not null;
alter table engines  alter column slug set not null;

-- Adiciona constraint de unicidade composta para engines
alter table engines add constraint engines_slug_project_unique unique (slug, project_id);
```

⚠️ O backfill remove acentos de forma simplificada (via regex). Slugs gerados de nomes com acentos devem ser revisados manualmente após a migração.

## 3. Validação de slug

Criar `lib/slug.ts` com uma função de validação (não geração — o usuário digita):

```ts
/** Retorna true se o slug é válido para URL */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
}
```

Regras: apenas letras minúsculas, números e hífens. Sem acentos, espaços ou caracteres especiais. Sem hífen no início ou fim.

## 4. API — POST `/api/projects`

```ts
const { name, slug } = body

if (!name || !slug) return 400
if (!isValidSlug(slug)) return 400 // "INVALID_SLUG"
// checar conflito de slug (além do conflito de name já existente)
// inserir com { name, slug, is_active: false }
```

## 5. API — POST `/api/engines`

```ts
const { name, slug, engine, projectId = null } = body

if (!name || !slug || !engine) return 400
if (!isValidSlug(slug)) return 400
// checar conflito de slug por (slug, project_id) além do conflito de name
// inserir com { name, slug, engine, project_id: projectId }
```

## 6. API — PATCH `/api/engines/:id`

Aceitar `slug` no body de patch. Verificar conflito `(slug, project_id)` antes de atualizar.

## 7. API — GET `/api/engines` e `/api/engines/active`

Adicionar suporte a `?projectSlug=`:

```ts
const projectSlug = searchParams.get("projectSlug")
if (projectSlug) {
  const { data: proj } = await supabase
    .from("projects").select("id").eq("slug", projectSlug).single()
  resolvedId = proj?.id ?? null
}
```

## 8. API — `POST /api/calc/[...segments]`

Substituir `eq("name", ...)` por `eq("slug", ...)` nas buscas de 2 segmentos:

```ts
// /api/calc/:projectSlug/:engineSlug
const { data: project } = await supabase
  .from("projects").select("id").eq("slug", projectName).single()

// ...
engineQuery = engineQuery.eq("slug", engineSegment)
```

O segmento de 1 elemento continua sendo UUID (`eq("id", segments[0])`).

## 9. Store — `stores/engineStore.ts`

### Tipos
```ts
export interface Project {
  id: string
  name: string
  slug: string      // ← novo
  isActive: boolean
  createdAt: string
}

export interface EngineRecord {
  id: string
  name: string
  slug: string      // ← novo
  engine: EngineState
  isActive: boolean
  projectId: string | null
  createdAt: string
  updatedAt: string
}
```

### mapProject / mapEngine
Adicionar `slug: row.slug as string` em ambas.

### createProject
```ts
createProject: (name: string, slug: string) => Promise<Project>
// body: JSON.stringify({ name, slug })
```

### saveEngine
```ts
saveEngine: (engine: EngineState, projectId?: string | null, slug?: string) => Promise<EngineRecord>
// Na criação (POST): incluir slug no body
// Na atualização (PATCH): não passa slug (já está salvo)
```

### saveAndActivate
```ts
saveAndActivate: (engine: EngineState, projectId?: string | null, slug?: string) => Promise<EngineRecord>
```

## 10. UI — Novo Projeto (`ProjectsLibrary/index.tsx`)

O formulário de criação tem só `newProjectName`. Adicionar `newProjectSlug`:

```tsx
const [newProjectSlug, setNewProjectSlug] = useState("")

// No form: dois inputs em coluna
// Input 1: "Nome do projeto" → newProjectName
// Input 2: "Slug (ex: financiamento-imobiliario)" → newProjectSlug
//           validação inline: isValidSlug() com borda vermelha se inválido

// handleCreateProject passa ambos:
createProject(name, slug)
```

## 11. UI — Salvar motor (`EngineBuilder/index.tsx`)

O builder salva via `saveAndActivate(engine, projectId)`. Quando o motor é **novo** (não existe no `records`), precisamos capturar o slug antes de salvar.

### Novo estado
```tsx
const [slugModal, setSlugModal] = useState(false)
const [pendingSlug, setPendingSlug] = useState("")
```

### handleSave — detectar criação nova
```tsx
// Se não existe registro com mesmo name+projectId → abrir slugModal
// Se existe → PATCH normal (sem slug)
```

### Modal de slug
Um modal simples com um input de slug. Ao confirmar, chama `saveAndActivate(engine, projectId, slug)` e fecha o modal.

### versionModal — adicionar campo slug
O modal de versão já captura o `versionName`. Adicionar `versionSlug` ao lado. Passar para `saveAndActivate`.

## Verificação

1. Rodar `migration_slugs.sql` no Supabase
2. `yarn dev` — sem erros de TypeScript
3. Criar projeto via UI → campo slug aparece → criar com slug válido → aparece na lista
4. No builder, salvar motor novo → modal de slug → salvar com slug → motor criado com slug no banco
5. `POST /api/calc/meu-projeto/meu-motor` com inputs → resultado correto
6. `POST /api/calc/meu-projeto/active` → motor ativo do projeto
7. `GET /api/engines?projectSlug=meu-projeto` → lista engines do projeto
8. Slug inválido (com acento) → API retorna 400

## Observações

- Slugs são imutáveis por padrão após criação (para não quebrar URLs de integração). PATCH de slug é possível via API mas não exposto na UI por ora.
- A migração de bancos existentes gera slugs aproximados — revisar manualmente slugs com caracteres especiais.
- Motores sem projeto (`project_id IS NULL`) têm slug único globalmente nesse escopo (a constraint `(slug, project_id)` aceita múltiplos NULLs em algumas DBs — confirmar comportamento no Postgres; se necessário, usar um UUID sentinela).
