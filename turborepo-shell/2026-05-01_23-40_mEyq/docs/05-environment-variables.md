# Environment Variables

> Estratégia de gerenciamento de variáveis de ambiente no Turborepo

## 🎯 O Desafio

Quando você clona o turborepo-shell com submodules, cada app vem **sem `.env`** (porque está no `.gitignore`). Precisamos de uma estratégia para:

1. **Compartilhar** variáveis comuns entre todos os MFEs
2. **Especificar** variáveis únicas por app (ex: `BASE_PATH`)
3. **Facilitar onboarding** de novos devs (evitar copiar/colar `.env` manualmente)
4. **Suportar múltiplos frameworks** (Next.js usa `NEXT_PUBLIC_`, Vite usa `VITE_`)

## 📁 Estrutura Recomendada

```
turborepo-shell/
├── .env                           # ⭐ Compartilhado (commitado)
├── .env.local                     # 🔐 Segredos locais (gitignored)
├── .env.example                   # 📝 Template para devs (commitado)
├── scripts/
│   └── setup-env.sh               # 🤖 Script de setup automático
├── apps/
│   ├── portal/
│   │   └── .env.local             # Apenas overrides específicos
│   ├── calc-engine/
│   │   └── .env.local             # Apenas overrides específicos
│   └── dashboard/
│       └── .env.local             # Apenas overrides específicos
└── packages/
    └── ...
```

## 🔧 Configuração

### 1. `.env` no Root (Compartilhado)

Valores **padrão de desenvolvimento** que todos os apps usam:

**.env** (root — commitado):
```env
# ============================================
# Shared Environment Variables
# ============================================

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000
VITE_API_URL=http://localhost:4000

# Auth Configuration
NEXT_PUBLIC_LOGIN_URL=https://login-dev.domain.com
VITE_LOGIN_URL=https://login-dev.domain.com

# Analytics
NEXT_PUBLIC_ANALYTICS_KEY=UA-123456
VITE_ANALYTICS_KEY=UA-123456

# Feature Flags
NEXT_PUBLIC_ENABLE_DEBUG=true
VITE_ENABLE_DEBUG=true
```

### 2. `.env.local` no Root (Segredos)

Valores **sensíveis** que não vão pro git:

**.env.local** (root — NÃO commitado):
```env
# ============================================
# Secrets - DO NOT COMMIT
# ============================================

SUPABASE_KEY=sk-xxxxxxxxxxxxxxx
DATABASE_URL=postgres://user:pass@localhost:5432/db
API_SECRET_KEY=your-secret-key-here
```

### 3. `.env.local` por App (Específico)

Cada app tem apenas suas **variáveis únicas**:

**apps/portal/.env.local**:
```env
BASE_PATH=
```

**apps/calc-engine/.env.local**:
```env
BASE_PATH=/calc
NEXT_PUBLIC_APP_NAME=Calculator
```

**apps/dashboard/.env.local**:
```env
BASE_PATH=/dashboard
VITE_APP_NAME=Dashboard
```

## 📝 Exemplo Prático

### Cenário: 3 envs iguais + 1 diferente

Você tem:
- ✅ `API_URL` → igual em todos os apps
- ✅ `LOGIN_URL` → igual em todos os apps
- ✅ `ANALYTICS_KEY` → igual em todos os apps
- ⚠️ `BASE_PATH` → **diferente** em cada app

### Solução:

**.env** (root):
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
VITE_API_URL=http://localhost:4000

NEXT_PUBLIC_LOGIN_URL=https://login-dev.domain.com
VITE_LOGIN_URL=https://login-dev.domain.com

NEXT_PUBLIC_ANALYTICS_KEY=UA-123456
VITE_ANALYTICS_KEY=UA-123456
```

**apps/calc-engine/.env.local**:
```env
BASE_PATH=/calc
```

**apps/dashboard/.env.local**:
```env
BASE_PATH=/dashboard
```

**Resultado:** Cada app lê as 3 envs compartilhadas + sua própria `BASE_PATH`.

## 🔀 Next.js vs Vite (Prefixos)

### O Problema

Next.js e Vite usam **prefixos diferentes** para variáveis públicas:

| Framework | Prefixo | Exemplo |
|---|---|---|
| **Next.js** | `NEXT_PUBLIC_` | `NEXT_PUBLIC_API_URL` |
| **Vite** | `VITE_` | `VITE_API_URL` |

### Abordagem A: Duplicar com Prefixos (Simples)

```env
# .env (root)
NEXT_PUBLIC_API_URL=http://localhost:4000
VITE_API_URL=http://localhost:4000

NEXT_PUBLIC_LOGIN_URL=https://login-dev.domain.com
VITE_LOGIN_URL=https://login-dev.domain.com
```

✅ **Prós:**
- Simples de entender
- Funciona out-of-the-box
- Sem configuração adicional

❌ **Contras:**
- Redundante (duas vars com mesmo valor)
- Precisa manter sincronizado

### Abordagem B: Variável Genérica + Mapeamento (Clean)

**.env** (root):
```env
# Generic variables (no prefix)
API_URL=http://localhost:4000
LOGIN_URL=https://login-dev.domain.com
ANALYTICS_KEY=UA-123456
```

**apps/calc-engine/next.config.ts** (Next.js):
```typescript
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.API_URL,
    NEXT_PUBLIC_LOGIN_URL: process.env.LOGIN_URL,
    NEXT_PUBLIC_ANALYTICS_KEY: process.env.ANALYTICS_KEY,
  },
}

export default nextConfig
```

**apps/dashboard/vite.config.ts** (Vite):
```typescript
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(env.API_URL),
      'import.meta.env.VITE_LOGIN_URL': JSON.stringify(env.LOGIN_URL),
      'import.meta.env.VITE_ANALYTICS_KEY': JSON.stringify(env.ANALYTICS_KEY),
    },
  }
})
```

✅ **Prós:**
- Sem redundância
- Single source of truth

❌ **Contras:**
- Requer config em cada app
- Mais complexo para onboarding

**Recomendação**: Use **Abordagem A** (duplicar) — é mais explícita e menos propensa a bugs.

## 🤖 Script de Setup Automático

Para facilitar o onboarding, crie um script que gera todos os `.env.local`:

**scripts/setup-env.sh**:
```bash
#!/bin/bash

echo "🔧 Setting up environment files..."

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variáveis compartilhadas
SHARED_ENV=$(cat << 'EOF'
# Shared variables (loaded from root .env)
# Override only if you need different values locally

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000
VITE_API_URL=http://localhost:4000

# Auth Configuration
NEXT_PUBLIC_LOGIN_URL=https://login-dev.domain.com
VITE_LOGIN_URL=https://login-dev.domain.com
EOF
)

# Portal (Next.js)
echo -e "${BLUE}Creating apps/portal/.env.local${NC}"
cat > apps/portal/.env.local << EOF
# Portal Environment Variables
$SHARED_ENV

# App-specific
BASE_PATH=
EOF

# Calc Engine (Next.js)
echo -e "${BLUE}Creating apps/calc-engine/.env.local${NC}"
cat > apps/calc-engine/.env.local << EOF
# Calc Engine Environment Variables
$SHARED_ENV

# App-specific
BASE_PATH=/calc
NEXT_PUBLIC_APP_NAME=Calculator
EOF

# Dashboard (Vite)
echo -e "${BLUE}Creating apps/dashboard/.env.local${NC}"
cat > apps/dashboard/.env.local << EOF
# Dashboard Environment Variables
$SHARED_ENV

# App-specific
BASE_PATH=/dashboard
VITE_APP_NAME=Dashboard
EOF

# Settings (Next.js)
echo -e "${BLUE}Creating apps/settings/.env.local${NC}"
cat > apps/settings/.env.local << EOF
# Settings Environment Variables
$SHARED_ENV

# App-specific
BASE_PATH=/settings
NEXT_PUBLIC_APP_NAME=Settings
EOF

echo ""
echo -e "${GREEN}✅ Environment files created!${NC}"
echo ""
echo "📝 Next steps:"
echo "  1. Review and edit the .env.local files if needed"
echo "  2. Copy .env.example to .env.local in root for secrets"
echo "  3. Run 'pnpm install' to install dependencies"
echo ""
```

**package.json** (root):
```json
{
  "scripts": {
    "setup": "bash scripts/setup-env.sh && pnpm install",
    "setup:env": "bash scripts/setup-env.sh",
    "dev": "turbo dev",
    "build": "turbo build"
  }
}
```

### Uso:

```bash
# Clone do repo
git clone --recurse-submodules git@github.com:company/turborepo-shell.git
cd turborepo-shell

# Setup completo (env + deps)
pnpm setup

# Ou apenas env
pnpm setup:env

# Pronto para rodar!
pnpm dev
```

## 📋 .env.example (Template)

Crie um template para documentar todas as variáveis:

**.env.example**:
```env
# ============================================
# Environment Variables Template
# ============================================
# Copy this to .env.local and fill with real values

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000
VITE_API_URL=http://localhost:4000

# Auth Configuration
NEXT_PUBLIC_LOGIN_URL=https://login-dev.domain.com
VITE_LOGIN_URL=https://login-dev.domain.com

# Analytics (optional)
NEXT_PUBLIC_ANALYTICS_KEY=
VITE_ANALYTICS_KEY=

# Secrets (add to .env.local in root, NOT in apps)
# SUPABASE_KEY=sk-xxxxxxx
# DATABASE_URL=postgres://user:pass@localhost:5432/db
# API_SECRET_KEY=your-secret-key
```

## 🔐 Ordem de Prioridade

O Next.js e Vite seguem esta ordem (último ganha):

1. `.env` (root)
2. `.env.local` (root)
3. `.env.development` / `.env.production`
4. `.env.development.local` / `.env.production.local`
5. Variáveis de ambiente do sistema

Exemplo:
```
.env (root)                  apps/calc/.env.local        Resultado Final
API_URL=localhost:4000   +   API_URL=localhost:5000  →  API_URL=localhost:5000
LOGIN_URL=login.dev      +   BASE_PATH=/calc         →  LOGIN_URL=login.dev
                                                         BASE_PATH=/calc
```

## 🚀 Turborepo: Declarando Env Vars

No `turbo.json`, declare quais variáveis cada task precisa:

**turbo.json**:
```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "env": [
        "NEXT_PUBLIC_API_URL",
        "NEXT_PUBLIC_LOGIN_URL",
        "VITE_API_URL",
        "VITE_LOGIN_URL",
        "BASE_PATH"
      ],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true,
      "env": [
        "NEXT_PUBLIC_*",
        "VITE_*",
        "BASE_PATH",
        "PORT"
      ]
    }
  }
}
```

Isso garante que o cache do Turborepo seja invalidado quando essas vars mudam.

## 🔒 Segurança

### ✅ Commitável (público)
- `.env` (valores padrão de dev)
- `.env.example` (template)
- `scripts/setup-env.sh`

### ❌ NÃO commitar (secrets)
- `.env.local` (root e apps)
- `.env.production.local`
- Qualquer arquivo com API keys, tokens, senhas

**.gitignore**:
```gitignore
# Environment variables
.env.local
.env*.local
.env.production
.env.production.local

# Mas permite .env (padrão de dev) e .env.example
!.env
!.env.example
```

## 📊 Comparação de Estratégias

| Estratégia | Onboarding | Manutenção | Segurança | DX |
|---|---|---|---|---|
| **Manual (copiar .env)** | ⭐ Ruim | ⭐ Ruim | ⭐⭐ OK | ⭐ Ruim |
| **Root .env + app .env.local** | ⭐⭐⭐ Bom | ⭐⭐⭐ Bom | ⭐⭐⭐ Bom | ⭐⭐⭐⭐ Ótimo |
| **Script setup-env.sh** | ⭐⭐⭐⭐⭐ Excelente | ⭐⭐⭐⭐ Ótimo | ⭐⭐⭐ Bom | ⭐⭐⭐⭐⭐ Excelente |
| **dotenvx (encriptado)** | ⭐⭐⭐ Bom | ⭐⭐⭐⭐ Ótimo | ⭐⭐⭐⭐⭐ Excelente | ⭐⭐⭐ Bom |

**Recomendação**: Use **Root .env + Script setup** (melhor custo-benefício).

## 🛠️ Troubleshooting

### Variável não está sendo lida

```bash
# Next.js
echo $NEXT_PUBLIC_API_URL  # Deve printar o valor

# Vite
# Veja no console do browser: import.meta.env.VITE_API_URL
```

**Soluções:**
1. Certifique-se que a var tem o prefixo correto (`NEXT_PUBLIC_` ou `VITE_`)
2. Reinicie o dev server (`pnpm dev`)
3. Limpe o cache do Next.js: `rm -rf .next`

### Valores diferentes entre apps

```bash
# Ver quais envs cada app está usando
cd apps/calc-engine
cat .env.local

cd ../dashboard
cat .env.local
```

### Script setup-env.sh não executa

```bash
# Dê permissão de execução
chmod +x scripts/setup-env.sh

# Execute
bash scripts/setup-env.sh
```

---

**Próximo**: [Developer Guide](06-developer-guide.md) - Guia prático para desenvolvedores
