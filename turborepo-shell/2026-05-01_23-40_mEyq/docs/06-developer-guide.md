# Developer Guide

> Guia prático para desenvolvedores trabalhando no turborepo-shell

## 🚀 Setup Inicial

### Pré-requisitos

```bash
# Node.js >= 18
node --version

# pnpm >= 8
npm install -g pnpm
pnpm --version
```

### Clonar o Repositório

```bash
# Clone com submodules
git clone --recurse-submodules git@github.com:company/turborepo-shell.git
cd turborepo-shell

# Ou se já clonou sem --recurse-submodules
git submodule update --init --recursive
```

### Instalar Dependências

```bash
pnpm install
```

Isso vai:
1. Instalar todas as dependências de todos os workspaces
2. Criar symlinks para packages locais (graças ao `pnpm.overrides`)
3. Gerar `pnpm-lock.yaml`

## 🏃 Rodando o Projeto

### Todas as aplicações (portal completo)

```bash
pnpm dev

# Ou
turbo dev
```

Acesse: **http://localhost:3024**

Todas as apps estarão rodando:
- Portal: `/`
- Calc Engine: `/calc`
- Dashboard: `/dashboard`
- Settings: `/settings`

### Aplicação específica

```bash
# Apenas calc-engine
turbo dev --filter=calc-engine

# Apenas dashboard
turbo dev --filter=dashboard

# Múltiplas apps específicas
turbo dev --filter=calc-engine --filter=dashboard
```

Com `--filter`, apenas as apps especificadas rodam localmente. As outras caem para o `fallback` (staging/prod).

### Rodar com fallback para staging

```bash
# Roda apenas calc localmente, outras apps vêm de staging
turbo dev --filter=calc-engine
```

- `localhost:3024/calc` → Local ✅
- `localhost:3024/dashboard` → Staging (fallback) 🌐

## 🏗️ Build

### Build all

```bash
pnpm build

# Ou
turbo build
```

Isso builda todas as apps e packages, respeitando a ordem de dependências (graças ao `dependsOn: ["^build"]`).

### Build específico

```bash
turbo build --filter=calc-engine
```

## 🧪 Testing

```bash
# Todos os testes
pnpm test

# Testes de uma app específica
turbo test --filter=calc-engine

# Testes de uma lib
turbo test --filter=@company/design-system
```

## 📝 Linting

```bash
# Lint all
pnpm lint

# Lint específico
turbo lint --filter=calc-engine
```

## 📦 Adicionando Dependências

### Em um MFE

```bash
cd apps/calc-engine
pnpm add react-query

# Ou do root
pnpm --filter calc-engine add react-query
```

### Em uma lib compartilhada

```bash
cd packages/design-system
pnpm add -D tsup

# Ou do root
pnpm --filter @company/design-system add -D tsup
```

### Dependência workspace (outra lib do monorepo)

No `package.json` do MFE, adicione a versão publicada:

```json
{
  "dependencies": {
    "@company/helptils": "^1.0.5"
  }
}
```

E rode:
```bash
pnpm install
```

O `pnpm.overrides` vai forçar o uso do workspace local automaticamente.

## ➕ Adicionando um Novo MFE

### 1. Crie o repo do MFE

```bash
# No GitHub/GitLab, crie um novo repo
# Ex: company/new-mfe
```

### 2. Adicione como submodule

```bash
cd turborepo-shell
git submodule add git@github.com:company/new-mfe.git apps/new-mfe
```

### 3. Configure o package.json

**apps/new-mfe/package.json**
```json
{
  "name": "new-mfe",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev --port $(turbo get-mfe-port)",
    "build": "next build",
    "lint": "eslint .",
    "test": "vitest"
  },
  "dependencies": {
    "@company/shared-auth": "^1.2.0",
    "@company/design-system": "^2.5.1",
    "next": "^14.0.0",
    "react": "^18.2.0"
  }
}
```

### 4. Configure o basePath

**apps/new-mfe/next.config.ts**
```typescript
const basePath = process.env.BASE_PATH || ''

const nextConfig = {
  basePath,
  assetPrefix: basePath || undefined,
}

export default nextConfig
```

### 5. Adicione no microfrontends.json

**apps/portal/microfrontends.json**
```json
{
  "applications": {
    "new-mfe": {
      "packageName": "new-mfe",
      "development": {
        "local": { "port": 3004 },
        "fallback": "https://new-mfe-staging.domain.com"
      },
      "routing": [
        {
          "group": "new-feature",
          "paths": ["/new", "/new/:path*"]
        }
      ]
    }
  }
}
```

### 6. Instale dependências

```bash
pnpm install
```

### 7. Teste

```bash
turbo dev
```

Acesse `localhost:3024/new` 🎉

## ➕ Adicionando uma Nova Lib

### 1. Crie o repo da lib

```bash
# Ex: company/my-utils
```

### 2. Adicione como submodule

```bash
git submodule add git@github.com:company/my-utils.git packages/my-utils
```

### 3. Configure package.json

**packages/my-utils/package.json**
```json
{
  "name": "@company/my-utils",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --dts --format esm,cjs",
    "dev": "tsup src/index.ts --dts --format esm,cjs --watch",
    "test": "vitest"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  }
}
```

### 4. Adicione override no root

**package.json** (root):
```json
{
  "pnpm": {
    "overrides": {
      "@company/my-utils": "workspace:*"
    }
  }
}
```

### 5. Use nos MFEs

**apps/calc-engine/package.json**
```json
{
  "dependencies": {
    "@company/my-utils": "^1.0.0"
  }
}
```

```bash
pnpm install
```

```tsx
import { myUtil } from '@company/my-utils'
```

## 🔄 Atualizando Submodules

### Atualizar todos

```bash
git submodule update --remote --merge
```

### Atualizar um específico

```bash
cd apps/calc-engine
git checkout main
git pull
cd ../..
git add apps/calc-engine
git commit -m "chore: update calc-engine submodule"
```

## 🐛 Troubleshooting

### Erro: "Port already in use"

```bash
# Mata processo na porta 3024
lsof -ti:3024 | xargs kill -9

# Ou mude a porta no microfrontends.json
"options": {
  "localProxyPort": 3025
}
```

### Erro: "Cannot find module '@company/design-system'"

```bash
# Reinstale dependências
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Builda a lib
cd packages/design-system
pnpm build
```

### Submodule não inicializado

```bash
git submodule update --init --recursive
```

### Cache do Turbo desatualizado

```bash
# Limpa cache
turbo build --force

# Ou deleta o cache
rm -rf .turbo
```

### pnpm não está sendo usado

Se alguém rodar `npm install` ou `yarn install`, você verá um erro. Isso é intencional! Use:

```bash
pnpm install
```

## 🔐 Variáveis de Ambiente

Para detalhes completos sobre gerenciamento de env vars, veja **[Environment Variables](05-environment-variables.md)**.

### Quick Start

```bash
# Gera todos os .env.local automaticamente
pnpm setup:env
```

**apps/calc-engine/.env.local** será criado com:
```env
BASE_PATH=/calc
NEXT_PUBLIC_APP_NAME=Calculator
```

As variáveis compartilhadas ficam no `.env` do root.

## 📤 Deploy

### Portal completo (todas as apps)

Cada app tem seu próprio deploy, mas compartilham o mesmo domínio via reverse proxy.

**Nginx config example:**
```nginx
server {
    server_name portal.domain.com;
    
    location /calc {
        proxy_pass http://calc-engine-service;
    }
    
    location /dashboard {
        proxy_pass http://dashboard-service;
    }
    
    location / {
        proxy_pass http://portal-service;
    }
}
```

### Standalone

Cada app pode ser deployado independentemente no seu próprio domínio:

- `calc.domain.com` → Deploy apenas de `apps/calc-engine`
- `dashboard.domain.com` → Deploy apenas de `apps/dashboard`

## 🔄 Workflow Diário

### Trabalhando em um MFE

```bash
# 1. Atualiza código
cd apps/calc-engine
git checkout -b feature/nova-feature
# ... faz mudanças ...

# 2. Testa localmente
cd ../..
turbo dev --filter=calc-engine

# 3. Commita no repo do MFE
cd apps/calc-engine
git add .
git commit -m "feat: nova feature"
git push origin feature/nova-feature

# 4. Atualiza submodule ref no turborepo
cd ../..
git add apps/calc-engine
git commit -m "chore: update calc-engine submodule"
git push
```

### Trabalhando em uma lib

```bash
# 1. Desenvolve
cd packages/design-system
# ... faz mudanças ...

# 2. Testa em um MFE
cd ../../apps/calc-engine
# O import já funciona (workspace)
import { Button } from '@company/design-system'

# 3. Builda e testa
cd ../..
turbo build --filter=@company/design-system
turbo test --filter=@company/design-system

# 4. Publica (se necessário para standalone)
cd packages/design-system
npm version minor
npm publish

# 5. Commita
git add .
git commit -m "feat: novo componente Button"
git push
```

## 📊 Comandos Úteis

```bash
# Ver status dos submodules
git submodule status

# Rodar comando em todos os MFEs
turbo dev

# Rodar comando em uma app específica
turbo dev --filter=calc-engine

# Listar todas as tasks disponíveis
turbo run --help

# Ver o que seria executado sem executar
turbo build --dry-run

# Visualizar dependências
pnpm list --depth=0

# Atualizar todas as dependências
pnpm update --interactive --latest
```

## 🎯 Dicas

### 1. Use o cache do Turborepo

O Turborepo cacheia builds. Se você não mudou nada, o build é instantâneo!

### 2. Trabalhe em uma app de cada vez

```bash
turbo dev --filter=calc-engine
```

Mais rápido que rodar todas as apps simultaneamente.

### 3. Lint antes de commitar

```bash
turbo lint --filter=calc-engine
```

### 4. Teste mudanças em libs imediatamente

Graças ao workspace, não precisa publicar libs para testar nos MFEs.

### 5. Use o fallback pra staging

Rodando apenas sua app localmente e outras em staging economiza recursos.

## 📚 Recursos

- [Turborepo Docs](https://turbo.build/repo/docs)
- [pnpm Docs](https://pnpm.io/)
- [Next.js Docs](https://nextjs.org/docs)
- [Git Submodules Guide](https://git-scm.com/book/en/v2/Git-Tools-Submodules)

---

**Pronto para começar!** 🚀 Qualquer dúvida, consulte a documentação ou pergunte ao time.
