# 🟢 Node.js e Package Managers (NPM, Yarn, pnpm) — Cheat Sheet Completo

> Referência rápida para o runtime Node.js, os 3 package managers do ecossistema (NPM, Yarn, pnpm), executor npx e gerenciador Corepack.
> Baseado na documentação oficial: [nodejs.org](https://nodejs.org/en/docs) | [docs.npmjs.com](https://docs.npmjs.com) | [yarnpkg.com](https://yarnpkg.com) | [pnpm.io](https://pnpm.io)
> Node v24+ / NPM v11+ / Yarn v4+ / pnpm v10+ / Corepack v0.34+

---

## 📋 Índice

- [Visão Geral — Quem Faz o Quê](#-visão-geral--quem-faz-o-quê)
- [NPM vs Yarn vs pnpm — Comparativo](#-npm-vs-yarn-vs-pnpm--comparativo)
- [Tabela Geral de Comandos](#-tabela-geral-de-comandos)
- [Instalação](#-instalação)
- [Node.js CLI](#-nodejs-cli)
- [Gerenciamento de Pacotes — Operações Comuns](#-gerenciamento-de-pacotes--operações-comuns)
- [Pacotes Globais vs Locais](#-pacotes-globais-vs-locais)
- [Scripts](#-scripts)
- [npx / yarn dlx / pnpm dlx — Execução de Pacotes](#-npx--yarn-dlx--pnpm-dlx--execução-de-pacotes)
- [Corepack — Gerenciador de Package Managers](#-corepack--gerenciador-de-package-managers)
- [Proteger o Package Manager do Projeto](#-proteger-o-package-manager-do-projeto)
- [NPM — Comandos Exclusivos](#-npm--comandos-exclusivos)
- [Yarn — Comandos Exclusivos e Recursos](#-yarn--comandos-exclusivos-e-recursos)
- [pnpm — Comandos Exclusivos e Recursos](#-pnpm--comandos-exclusivos-e-recursos)
- [Workspaces (Monorepo)](#-workspaces-monorepo)
- [package.json — Referência](#-packagejson--referência)
- [Arquivos de Configuração](#-arquivos-de-configuração)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Caminhos dos Arquivos (macOS)](#-caminhos-dos-arquivos-macos)
- [Limpeza / Desinstalação](#-limpeza--desinstalação)
- [Troubleshooting](#-troubleshooting)
- [Dicas Úteis / Receitas](#-dicas-úteis--receitas)
- [Referência Completa de Comandos CLI](#-referência-completa-de-comandos-cli)

---

## ℹ️ Visão Geral — Quem Faz o Quê

| Ferramenta | O que é | Vem com |
|---|---|---|
| **Node.js** | Runtime JavaScript fora do navegador | — (instalado via NVM) |
| **NPM** | Package manager padrão do Node.js | Node.js (instalado junto) |
| **Yarn** | Package manager alternativo (Facebook/Meta) | Corepack (via `corepack enable`) |
| **pnpm** | Package manager eficiente em disco | Corepack (via `corepack enable`) |
| **npx** | Executor de pacotes (sem instalar globalmente) | NPM (instalado junto) |
| **Corepack** | Gerenciador de package managers (yarn, pnpm) | Node.js (built-in desde v16.9+) |

### Hierarquia de instalação

```
NVM → instala/gerencia versões do Node.js
  └── Node.js → vem com NPM + npx + Corepack
        ├── NPM → package manager padrão (vem junto)
        │     └── npx → executa pacotes sem instalar
        └── Corepack → gerencia Yarn e pnpm
              ├── Yarn → package manager alternativo
              └── pnpm → package manager alternativo
```

> 💡 **Dica:** Cada versão do Node instalada via NVM tem sua própria cópia de NPM, npx e Corepack. Ao trocar de versão com `nvm use`, tudo muda junto.

---

## 🔀 NPM vs Yarn vs pnpm — Comparativo

### Visão geral

| Aspecto | NPM | Yarn (v4 Berry) | pnpm |
|---|---|---|---|
| **Criado por** | npm, Inc. (GitHub/Microsoft) | Facebook/Meta | Zoltan Kochan |
| **Vem com** | Node.js (instalado junto) | Corepack | Corepack |
| **Lockfile** | `package-lock.json` | `yarn.lock` | `pnpm-lock.yaml` |
| **Estrutura node_modules** | Flat (hoisted) | Plug'n'Play (sem node_modules) ou hoisted | Content-addressable store + symlinks |
| **Velocidade** | Boa | Boa | Mais rápida |
| **Uso de disco** | Normal (cópia completa) | Normal ou zero-install | Mais eficiente (hard links) |
| **Strictness** | Permissivo (hoisting) | Strict com PnP | Strict por padrão |
| **Workspaces** | Suportado | Maduro | Maduro |
| **Offline** | Via cache | Zero-installs (PnP) | Via content store |

### Quando usar qual

| Cenário | Recomendação | Por quê |
|---|---|---|
| Projeto simples, começo rápido | **NPM** | Já vem instalado, zero config |
| Time grande, consistência | **Yarn** ou **pnpm** | Lockfile + `packageManager` via Corepack |
| Monorepo com muitos pacotes | **pnpm** ou **Yarn** | Workspaces maduros, mais rápidos |
| CI/CD com cache | **pnpm** | Content-addressable store = cache eficiente |
| Preocupação com espaço em disco | **pnpm** | Hard links evitam duplicação |
| Segurança (phantom deps) | **pnpm** | Strict por padrão, não permite phantom deps |
| Zero-install (sem `npm install`) | **Yarn PnP** | Commit do cache no repo, sem node_modules |

> 💡 **Phantom dependencies:** Quando um pacote usa uma dependência que não declarou explicitamente (funciona por hoisting do node_modules). O pnpm e Yarn PnP impedem isso.

### Lockfiles

| Package Manager | Lockfile | Gerado por |
|---|---|---|
| NPM | `package-lock.json` | `npm install` |
| Yarn | `yarn.lock` | `yarn install` |
| pnpm | `pnpm-lock.yaml` | `pnpm install` |

> ⚠️ **Atenção:** Nunca misture lockfiles! Se o projeto usa Yarn, não rode `npm install` — isso criaria um `package-lock.json` conflitante. Respeite o `packageManager` do `package.json`.

---

## 📊 Tabela Geral de Comandos

### Node.js

| Comando | O que faz |
|---|---|
| `node` | Inicia o REPL interativo |
| `node app.js` | Executa um arquivo JavaScript |
| `node -e "code"` | Executa código inline |
| `node -p "expr"` | Avalia e imprime expressão |
| `node --watch app.js` | Executa com auto-restart ao mudar arquivos |
| `node --inspect app.js` | Inicia com debugger (Chrome DevTools) |
| `node --env-file=.env app.js` | Carrega variáveis de ambiente de arquivo |
| `node --version` | Mostra a versão do Node |

### Equivalência de Comandos — NPM vs Yarn vs pnpm

| Operação | NPM | Yarn | pnpm |
|---|---|---|---|
| **Iniciar projeto** | `npm init -y` | `yarn init` | `pnpm init` |
| **Instalar tudo** | `npm install` | `yarn install` / `yarn` | `pnpm install` |
| **Adicionar pacote** | `npm install <pkg>` | `yarn add <pkg>` | `pnpm add <pkg>` |
| **Adicionar devDep** | `npm install -D <pkg>` | `yarn add -D <pkg>` | `pnpm add -D <pkg>` |
| **Adicionar global** | `npm install -g <pkg>` | `yarn global add <pkg>` ¹ | `pnpm add -g <pkg>` |
| **Remover pacote** | `npm uninstall <pkg>` | `yarn remove <pkg>` | `pnpm remove <pkg>` |
| **Atualizar tudo** | `npm update` | `yarn up` | `pnpm update` |
| **Atualizar pacote** | `npm update <pkg>` | `yarn up <pkg>` | `pnpm update <pkg>` |
| **Atualizar interativo** | `npx npm-check-updates -i` | `yarn upgrade-interactive` | `pnpm update -i` |
| **Listar deps** | `npm ls --depth=0` | `yarn info --name-only` | `pnpm ls --depth=0` |
| **Listar globais** | `npm ls -g --depth=0` | `yarn global list` ¹ | `pnpm ls -g --depth=0` |
| **Ver desatualizados** | `npm outdated` | `yarn upgrade-interactive` | `pnpm outdated` |
| **Executar script** | `npm run <script>` | `yarn <script>` / `yarn run <script>` | `pnpm <script>` / `pnpm run <script>` |
| **Executar binário** | `npx <cmd>` | `yarn dlx <cmd>` | `pnpm dlx <cmd>` |
| **Instalar limpo (CI)** | `npm ci` | `yarn install --immutable` | `pnpm install --frozen-lockfile` |
| **Audit segurança** | `npm audit` | `yarn npm audit` | `pnpm audit` |
| **Corrigir audit** | `npm audit fix` | — (manual) | — (manual) |
| **Limpar cache** | `npm cache clean --force` | `yarn cache clean` | `pnpm store prune` |
| **Linkar pacote** | `npm link` | `yarn link` | `pnpm link` |
| **Publicar** | `npm publish` | `yarn npm publish` | `pnpm publish` |
| **Login** | `npm login` | `yarn npm login` | `pnpm login` |
| **Ver info do pacote** | `npm view <pkg>` | `yarn npm info <pkg>` | `pnpm view <pkg>` |
| **Rebuild nativos** | `npm rebuild` | `yarn rebuild` | `pnpm rebuild` |
| **Dedupe** | `npm dedupe` | `yarn dedupe` | — (não precisa, store único) |
| **Por que instalou** | `npm explain <pkg>` | `yarn explain <pkg>` | `pnpm why <pkg>` |
| **Ver versão do PM** | `npm --version` | `yarn --version` | `pnpm --version` |

> ¹ No Yarn v4 (Berry), `yarn global` foi removido. Use `corepack install -g` ou `npm install -g` para pacotes globais.

### Corepack

| Comando | O que faz |
|---|---|
| `corepack enable` | Ativa shims para yarn e pnpm |
| `corepack disable` | Desativa shims |
| `corepack install` | Instala package manager do `packageManager` field |
| `corepack install -g <pm@ver>` | Instala package manager globalmente |
| `corepack use <pm@ver>` | Define package manager no `package.json` |
| `corepack up` | Atualiza package manager para última versão |
| `corepack pack` | Empacota package manager em `.tgz` |
| `corepack cache clean` | Limpa cache do Corepack |

---

## 🚀 Instalação

### Node.js via NVM (recomendado)

```bash
# Instalar a versão LTS mais recente
nvm install --lts

# Instalar versão específica
nvm install 24

# Verificar
node --version       # v24.14.1
npm --version        # 11.11.0
npx --version        # 11.11.0
corepack --version   # 0.34.6
```

> ⚠️ **Atenção:** Não use `brew install node` se já usa NVM. Ter Node via Homebrew e NVM ao mesmo tempo causa conflitos de PATH. Veja [HOMEBREW.md — Brew vs NVM vs NPM](./HOMEBREW.md#-brew-vs-nvm-vs-npm).

### Ativar Yarn e pnpm via Corepack

```bash
# Ativar Corepack (cria shims para yarn e pnpm)
corepack enable

# Verificar
yarn --version       # 1.22.22 (classic, default) ou 4.x (se configurado)
pnpm --version       # 10.33.0
```

### Atualizar NPM

```bash
# Atualizar npm para a última versão compatível com o Node ativo
nvm install-latest-npm

# Ou diretamente
npm install -g npm@latest
```

### Atualizar Corepack

```bash
# Corepack vem com o Node, mas pode ser atualizado
npm install -g corepack@latest
```

### Definir package manager de um projeto

```bash
# Definir Yarn v4 para o projeto
corepack use yarn@4.9.1

# Definir pnpm para o projeto
corepack use pnpm@10.33.0

# Isso adiciona ao package.json:
# "packageManager": "yarn@4.9.1"
```

---

## 🟢 Node.js CLI

### Executar código

```bash
# Executar um arquivo
node app.js

# Executar código inline
node -e "console.log('Olá mundo')"

# Avaliar e imprimir expressão
node -p "2 + 2"               # 4
node -p "process.versions"    # mostra versões de dependências internas

# REPL interativo
node
# > 2 + 2
# 4
# > .exit
```

### Watch mode (auto-restart)

```bash
# Reinicia automaticamente quando arquivos mudam
node --watch app.js

# Watch apenas em arquivos específicos
node --watch-path=./src app.js
node --watch-path=./src --watch-path=./config app.js

# Watch sem preservar output (limpa terminal)
node --watch --watch-preserve-output=false app.js
```

> 💡 **Dica:** O watch mode é nativo desde o Node v18.11+ — substitui o `nodemon` para desenvolvimento simples.

### Carregar variáveis de ambiente

```bash
# Carregar .env automaticamente (Node v20.6+)
node --env-file=.env app.js

# Múltiplos arquivos .env
node --env-file=.env --env-file=.env.local app.js
```

### Debug e inspeção

```bash
# Iniciar com inspector (Chrome DevTools)
node --inspect app.js                    # porta 9229
node --inspect=0.0.0.0:9229 app.js      # acessível externamente
node --inspect-brk app.js               # para no início (antes de executar)

# Verificar sintaxe sem executar
node --check app.js
node -c app.js
```

### TypeScript (Node v22.6+)

```bash
# Executar TypeScript diretamente (experimental, type-stripping)
node --experimental-strip-types app.ts

# Node v23.6+ — habilitado por padrão
node app.ts
```

### Flags úteis

| Flag | O que faz |
|---|---|
| `--watch` | Auto-restart ao mudar arquivos |
| `--watch-path=<dir>` | Watch apenas em diretório específico |
| `--env-file=<path>` | Carrega variáveis de ambiente de arquivo |
| `--inspect` | Ativa inspector na porta 9229 |
| `--inspect-brk` | Ativa inspector e para na primeira linha |
| `-e, --eval "code"` | Executa código inline |
| `-p, --print "expr"` | Avalia e imprime expressão |
| `-c, --check` | Verifica sintaxe sem executar |
| `-r, --require <mod>` | Pré-carrega módulo CommonJS |
| `--import <mod>` | Pré-carrega módulo ESM |
| `--experimental-strip-types` | Habilita suporte a TypeScript |
| `--max-old-space-size=<MB>` | Define limite de memória heap |
| `--enable-source-maps` | Habilita source maps para stack traces |
| `--no-warnings` | Suprime avisos |
| `--trace-warnings` | Mostra stack trace dos avisos |
| `--title=<title>` | Define título do processo |
| `-v, --version` | Mostra versão do Node |
| `-h, --help` | Mostra ajuda |

---

## 📦 Gerenciamento de Pacotes — Operações Comuns

Esta seção mostra as operações do dia-a-dia com comandos equivalentes nos 3 package managers.

### Iniciar projeto

```bash
# NPM
npm init -y

# Yarn
yarn init

# pnpm
pnpm init
```

### Instalar todas as dependências

```bash
# NPM
npm install

# Yarn
yarn install                             # ou apenas: yarn

# pnpm
pnpm install
```

### Adicionar pacote

```bash
# NPM
npm install express                      # dependência
npm install -D typescript                # devDependency
npm install express@4.18.0              # versão específica
npm install express@latest              # última versão

# Yarn
yarn add express
yarn add -D typescript
yarn add express@4.18.0
yarn add express@latest

# pnpm
pnpm add express
pnpm add -D typescript
pnpm add express@4.18.0
pnpm add express@latest
```

### Remover pacote

```bash
# NPM
npm uninstall express

# Yarn
yarn remove express

# pnpm
pnpm remove express
```

### Atualizar pacotes

```bash
# NPM — atualiza dentro do range do semver
npm update
npm update express                       # pacote específico
npm outdated                             # ver desatualizados

# Yarn — atualiza dentro do range
yarn up
yarn up express
yarn upgrade-interactive                 # interativo (escolhe o que atualizar)

# pnpm — atualiza dentro do range
pnpm update
pnpm update express
pnpm update -i                           # interativo
pnpm outdated                            # ver desatualizados

# Atualizar para última versão (ignora range do package.json)
npm install express@latest               # NPM
yarn add express@latest                  # Yarn (atualiza também o package.json)
pnpm add express@latest                  # pnpm
```

### Listar dependências

```bash
# NPM
npm ls --depth=0                         # diretas
npm ls                                   # árvore completa
npm explain express                      # por que está instalado

# Yarn
yarn info --name-only                    # lista nomes
yarn explain express                     # por que está instalado
yarn why express                         # alias

# pnpm
pnpm ls --depth=0                        # diretas
pnpm ls                                  # árvore completa
pnpm why express                         # por que está instalado
```

### Instalação limpa (CI/CD)

```bash
# NPM — remove node_modules, instala exatamente do lockfile
npm ci

# Yarn — falha se lockfile estiver desatualizado
yarn install --immutable

# pnpm — falha se lockfile estiver desatualizado
pnpm install --frozen-lockfile
```

> **Importante:** Em CI/CD, sempre use o modo strict/imutável. Isso garante builds reproduzíveis.

### Instalar de fontes alternativas

```bash
# De repositório Git
npm install github:user/repo
yarn add user/repo
pnpm add github:user/repo

# De tarball
npm install ./local-package.tgz
yarn add ./local-package.tgz
pnpm add ./local-package.tgz

# De diretório local
npm install ../my-local-lib
yarn add ../my-local-lib
pnpm add ../my-local-lib
```

### Link (desenvolvimento local)

```bash
# NPM
npm link                                 # no pacote: cria symlink global
npm link my-package                      # no projeto: linka

# Yarn
yarn link                                # no pacote
yarn link my-package                     # no projeto

# pnpm
pnpm link                                # no pacote
pnpm link my-package                     # no projeto
```

### Rebuild e manutenção

```bash
# Reconstruir pacotes nativos (após atualizar Node)
npm rebuild                              # NPM
yarn rebuild                             # Yarn
pnpm rebuild                             # pnpm

# Remover duplicatas
npm dedupe                               # NPM
yarn dedupe                              # Yarn
# pnpm não precisa — content-addressable store já evita duplicação

# Remover pacotes que não estão no package.json
npm prune                                # NPM
# Yarn e pnpm fazem isso automaticamente no install
```

---

## 🔄 Pacotes Globais vs Locais

### Diferença

| Aspecto | Global | Local (padrão) |
|---|---|---|
| **Onde instala** | Diretório global do sistema | `./node_modules/` |
| **Acessível como CLI** | Sim (qualquer diretório) | Apenas via `npx`/`pnpm dlx` ou `npm run` |
| **Listado no** | Nada (não vai no `package.json`) | `package.json` |
| **Muda com NVM** | Sim (cada versão do Node tem os seus) | Não (fica no projeto) |
| **Usar para** | CLIs do dia-a-dia | Dependências de projeto |

### Gerenciar pacotes globais

```bash
# NPM
npm install -g @anthropic-ai/claude-code
npm uninstall -g @anthropic-ai/claude-code
npm ls -g --depth=0
npm update -g

# pnpm
pnpm add -g @anthropic-ai/claude-code
pnpm remove -g @anthropic-ai/claude-code
pnpm ls -g --depth=0
pnpm update -g
```

> ⚠️ **Atenção:** No Yarn v4 (Berry), `yarn global` foi removido. Para pacotes globais, use `npm install -g` ou `corepack install -g`.

> ⚠️ **Atenção:** Pacotes globais via NPM/pnpm são **por versão do Node** (via NVM). Se trocar de `nvm use 22` para `nvm use 24`, pacotes globais mudam junto.

### Quando usar global vs local

| Use global para | Use local (padrão) para |
|---|---|
| CLIs que você usa em qualquer projeto | Dependências de um projeto específico |
| Ferramentas de desenvolvimento gerais | Libs e frameworks |
| Ex: `claude-code`, `corepack` | Ex: `express`, `react`, `typescript` |

> 💡 **Dica:** Na dúvida, instale **local** e use via `npx`/`pnpm dlx`. Prefira manter poucos pacotes globais.

---

## 📜 Scripts

Os 3 package managers suportam scripts definidos no `package.json`. A definição é a mesma — muda apenas como executar.

### Definir scripts no package.json

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js",
    "build": "tsc && next build",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "preview": "next start",
    "clean": "rm -rf node_modules .next dist"
  }
}
```

### Executar scripts

```bash
# NPM — precisa de "run" (exceto start, test, restart, stop)
npm run dev
npm run build
npm start                                # atalho para npm run start
npm test                                 # atalho para npm run test

# Yarn — não precisa de "run"
yarn dev                                 # yarn detecta que é um script
yarn build
yarn start
yarn test

# pnpm — não precisa de "run"
pnpm dev
pnpm build
pnpm start
pnpm test
```

> 💡 **Dica:** Yarn e pnpm permitem rodar scripts diretamente (sem `run`). No NPM, apenas `start`, `test`, `restart` e `stop` funcionam sem `run`.

### Executar com argumentos extras

```bash
# NPM — usar -- para separar argumentos
npm run test -- --coverage
npm run lint -- --fix

# Yarn — args direto (sem --)
yarn test --coverage
yarn lint --fix

# pnpm — args direto (sem --)
pnpm test --coverage
pnpm lint --fix
```

### Scripts de lifecycle

O NPM/Yarn/pnpm executam scripts automaticamente em certos momentos:

| Script | Quando roda |
|---|---|
| `preinstall` | Antes do install |
| `install` | Durante install (após instalar deps) |
| `postinstall` | Depois do install |
| `prepare` | Antes de pack/publish e depois de install (local) |
| `prepublishOnly` | Antes do publish |
| `preversion` | Antes de version bump |
| `version` | Durante version bump |
| `postversion` | Depois de version bump |

---

## ⚡ npx / yarn dlx / pnpm dlx — Execução de Pacotes

Executam pacotes sem precisar instalá-los globalmente. Cada package manager tem seu executor:

| Package Manager | Executor | Comando |
|---|---|---|
| NPM | `npx` | `npx <pkg>` |
| Yarn | `yarn dlx` | `yarn dlx <pkg>` |
| pnpm | `pnpm dlx` | `pnpm dlx <pkg>` |

### Uso básico

```bash
# NPM (npx)
npx create-next-app@latest my-app
npx eslint .
npx prettier --write .

# Yarn (dlx)
yarn dlx create-next-app my-app
yarn dlx eslint .

# pnpm (dlx)
pnpm dlx create-next-app my-app
pnpm dlx eslint .
```

### npx — detalhes

```bash
# Executar versão específica
npx typescript@5.0 tsc --init

# Executar sem pedir confirmação
npx -y create-next-app my-app

# Executar apenas se já estiver instalado (não baixa)
npx --no create-next-app my-app

# Instalar pacote e executar comando diferente
npx -p typescript tsc --init
npx --package=typescript tsc --init

# Múltiplos pacotes
npx -p typescript -p ts-node ts-node script.ts
```

### Resolução de pacotes (npx)

Quando você roda `npx <cmd>`, a resolução segue esta ordem:

1. **Local** → `./node_modules/.bin/<cmd>` (se existe no projeto)
2. **Global** → pacote global (se instalado com `npm i -g`)
3. **Registry** → baixa temporariamente do npm registry

### Exemplos práticos

```bash
# Criar projetos (scaffolding)
npx create-next-app@latest my-app       # NPM
yarn dlx create-next-app my-app          # Yarn
pnpm dlx create-next-app my-app          # pnpm

# Ferramentas de desenvolvimento
npx tsc --init                           # criar tsconfig.json
npx eslint --init                        # configurar ESLint
npx prettier --write .                   # formatar código
npx tailwindcss init                     # criar tailwind.config.js

# Utilitários
npx serve                                # servir diretório atual via HTTP
npx kill-port 3000                       # matar processo na porta
npx npm-check-updates -u                 # atualizar versões no package.json
```

> 💡 **Dica:** Use `npx`/`dlx` para CLIs que você não usa com frequência — evita poluir os pacotes globais.

---

## 📎 Corepack — Gerenciador de Package Managers

O Corepack é uma ferramenta **built-in do Node.js** (desde v16.9+) que gerencia versões do **Yarn** e **pnpm** de forma transparente. Ele usa o campo `packageManager` do `package.json` para saber qual package manager e versão usar.

### Por que usar Corepack

- ✅ Garante que todos no time usem a **mesma versão** do Yarn/pnpm
- ✅ Não precisa instalar Yarn/pnpm globalmente
- ✅ O campo `packageManager` no `package.json` serve como "lock" do package manager
- ✅ Evita instalar via Homebrew (`brew install yarn` ❌ → `corepack enable` ✅)

### Ativar / Desativar

```bash
# Ativar Corepack (cria shims para yarn e pnpm)
corepack enable

# Desativar Corepack (remove shims)
corepack disable
```

> ⚠️ **Atenção:** Ao rodar `corepack enable`, ele cria shims para `yarn` e `pnpm` no `~/.nvm/versions/node/v<ver>/bin/`. Se tiver Yarn instalado via Homebrew, desinstale primeiro: `brew uninstall yarn`.

### Definir package manager no projeto

```bash
# Define Yarn como package manager e salva no package.json
corepack use yarn@4.9.1

# Define pnpm
corepack use pnpm@10.33.0

# Resultado no package.json:
# "packageManager": "yarn@4.9.1"
```

### Campo packageManager no package.json

```json
{
  "name": "my-project",
  "packageManager": "yarn@4.9.1"
}
```

Quando alguém roda `yarn` neste projeto, o Corepack automaticamente:
1. Verifica se a versão `4.9.1` do Yarn está disponível
2. Baixa se necessário
3. Executa com a versão correta

### Instalar package manager

```bash
# Instalar o package manager definido no packageManager field
corepack install

# Instalar package manager globalmente
corepack install -g yarn@4.9.1
corepack install -g pnpm@10.33.0

# Atualizar para última versão
corepack up

# Verificar qual versão está sendo usada
yarn --version
pnpm --version
```

### Cache e offline

```bash
# Limpar cache do Corepack
corepack cache clean

# Empacotar para uso offline (útil para CI sem internet)
corepack pack

# Instalar de .tgz
corepack install --from=./corepack.tgz
```

### Corepack vs instalar diretamente

| Método | Prós | Contras |
|---|---|---|
| `corepack enable` + `packageManager` | Versionado no projeto, todos usam igual | Precisa ativar manualmente |
| `npm install -g yarn` | Simples | Versão pode divergir entre devs |
| `brew install yarn` | Simples | Conflita com Corepack/NVM, sem controle de versão por projeto |

> 💡 **Dica:** Use Corepack para Yarn e pnpm. NPM não precisa do Corepack pois já vem com o Node.

---

## 🔒 Proteger o Package Manager do Projeto

Se o projeto usa Yarn, rodar `npm install` ou `pnpm install` cria lockfiles conflitantes e reestrutura o `node_modules/` de forma incompatível. Existem várias formas de proteger contra isso.

### O que acontece se rodar o PM errado

| Ação | Resultado |
|---|---|
| `npm install` num projeto Yarn | Cria `package-lock.json` conflitante, reestrutura `node_modules/` |
| `pnpm install` num projeto Yarn | Cria `pnpm-lock.yaml` conflitante, reestrutura `node_modules/` |
| `yarn install` num projeto NPM | Cria `yarn.lock` conflitante |

> ⚠️ **Atenção:** Nunca misture lockfiles! Se aconteceu, limpe e reinstale com o PM correto:
> ```bash
> rm -rf node_modules package-lock.json pnpm-lock.yaml  # remover lockfiles errados
> yarn install                                           # reinstalar com o PM correto
> ```

### Método 1: `packageManager` no package.json (Corepack)

```json
{
  "packageManager": "yarn@4.9.1"
}
```

O Corepack garante a **versão certa** do PM, mas por padrão **não bloqueia** outros PMs.

### Método 2: `only-allow` no preinstall (recomendado)

O pacote [`only-allow`](https://www.npmjs.com/package/only-allow) bloqueia qualquer PM que não seja o esperado:

```json
{
  "scripts": {
    "preinstall": "npx only-allow yarn"
  }
}
```

```bash
$ npm install
# ❌ Use "yarn" for installation in this project.

$ pnpm install
# ❌ Use "yarn" for installation in this project.

$ yarn install
# ✅ Funciona normalmente
```

> 💡 **Dica:** `only-allow` funciona **sempre**, independente da config do `.npmrc` de cada dev — porque o `preinstall` roda antes do install e aborta o processo.

### Método 3: `engines` no package.json

Cada PM checa seu próprio campo no `engines`:

```json
{
  "engines": {
    "node": ">=20",
    "npm": "please-use-yarn",
    "yarn": ">=4.0.0",
    "pnpm": "please-use-yarn"
  }
}
```

| PM que roda | Checa | Resultado |
|---|---|---|
| `npm install` | `engines.npm` → `"please-use-yarn"` ❌ | Falha (com `engine-strict`) |
| `yarn install` | `engines.yarn` → `">=4.0.0"` ✅ | Funciona |
| `pnpm install` | `engines.pnpm` → `"please-use-yarn"` ❌ | Falha (com `engine-strict`) |

> ⚠️ **Atenção:** `engines` só bloqueia se `engine-strict=true` estiver no `.npmrc`. Sem isso, npm e pnpm apenas **avisam** mas instalam mesmo assim.

### Método 4: `COREPACK_ENABLE_STRICT=1` (global)

Variável de ambiente que bloqueia qualquer PM não definido em `packageManager`:

```bash
# Adicionar ao ~/.zshrc
export COREPACK_ENABLE_STRICT=1
```

```bash
$ npm install  # num projeto com "packageManager": "yarn@4.9.1"
# ❌ This project is configured to use yarn
```

> **Nota:** Isso é uma config **da sua máquina**, não do repo. Não protege outros devs.

### Combo recomendado (máxima proteção)

```json
{
  "packageManager": "yarn@4.9.1",
  "engines": {
    "node": ">=20",
    "npm": "please-use-yarn",
    "pnpm": "please-use-yarn",
    "yarn": ">=4.0.0"
  },
  "scripts": {
    "preinstall": "npx only-allow yarn"
  }
}
```

| Camada | Protege contra | Escopo |
|---|---|---|
| `packageManager` | Versão errada do PM | Por repo (Corepack) |
| `preinstall` + `only-allow` | PM errado | Por repo (sempre funciona) |
| `engines` + `engine-strict` | PM errado + Node errado | Por repo (precisa de .npmrc) |
| `COREPACK_ENABLE_STRICT=1` | PM errado | Por máquina (env var) |

---

## 📦 NPM — Comandos Exclusivos

Comandos do NPM que não têm equivalente direto no Yarn/pnpm:

### Informação e busca

```bash
# Ver info completa de um pacote no registry
npm view express
npm view express version                 # última versão
npm view express versions                # todas as versões
npm view express dependencies
npm view express dist-tags

# Abrir no navegador
npm docs express                         # documentação
npm repo express                         # repositório
npm bugs express                         # issue tracker

# Buscar pacotes
npm search react
npm search --long react

# Diagnóstico do ambiente
npm doctor
```

### Publicação e registry

```bash
# Autenticação
npm login
npm logout
npm whoami

# Publicar
npm publish
npm publish --tag beta
npm publish --access=public              # pacote com escopo público
npm publish --dry-run                    # simular

# Gerenciar versões publicadas
npm unpublish <pkg>@<ver>
npm deprecate <pkg>@<ver> "msg"
npm undeprecate <pkg>@<ver>

# Tags de distribuição
npm dist-tag add <pkg>@<ver> <tag>
npm dist-tag ls <pkg>

# Gerenciar permissões
npm access
npm owner add <user> <pkg>
npm owner ls <pkg>
npm token list
npm token create
```

### Segurança

```bash
# Audit de vulnerabilidades
npm audit
npm audit fix                            # corrige automaticamente
npm audit fix --force                    # corrige forçosamente (breaking changes)
npm audit signatures                     # verifica assinaturas

# SBOM (Software Bill of Materials)
npm sbom --sbom-format=spdx
```

### Configuração

```bash
# Ver configurações
npm config list
npm config list -l                       # incluindo defaults
npm config get registry

# Definir / remover
npm config set registry https://registry.npmjs.org/
npm config delete registry

# Abrir .npmrc
npm config edit
npm config edit -g                       # global

# Paths
npm prefix                               # raiz do projeto
npm prefix -g                            # prefixo global
npm root                                 # node_modules
npm root -g                              # node_modules global
```

### Versionamento

```bash
# Bump de versão (atualiza package.json + cria git tag)
npm version patch                        # 1.0.0 → 1.0.1
npm version minor                        # 1.0.0 → 1.1.0
npm version major                        # 1.0.0 → 2.0.0
npm version prerelease                   # 1.0.0-0 → 1.0.0-1
npm version from-git                     # usa última tag do git

# Sem criar git tag
npm version patch --no-git-tag-version

# Manipular package.json
npm pkg get name
npm pkg get version
npm pkg set scripts.dev="node --watch server.js"
npm pkg delete scripts.dev
```

---

## 🧶 Yarn — Comandos Exclusivos e Recursos

### Yarn v1 (Classic) vs Yarn v4 (Berry)

| Aspecto | Yarn Classic (v1) | Yarn Berry (v4) |
|---|---|---|
| **Versão** | 1.22.x | 4.x |
| **node_modules** | Sim (flat) | Opcional (PnP é o padrão) |
| **Plug'n'Play (PnP)** | Não | Sim (padrão) |
| **Zero-installs** | Não | Sim |
| **Global packages** | `yarn global add` | Removido (use npm/corepack) |
| **Arquivo de config** | `.yarnrc` | `.yarnrc.yml` |
| **Lockfile** | `yarn.lock` (v1 format) | `yarn.lock` (v2+ format) |

> 💡 Quando você usa `corepack use yarn@4.9.1`, o Yarn Berry é automaticamente configurado.

### Plug'n'Play (PnP)

O PnP é o modo padrão do Yarn v4. Em vez de `node_modules`, ele cria um arquivo `.pnp.cjs` que mapeia todas as dependências. Isso é mais rápido e evita phantom dependencies.

```bash
# Instalar com PnP (padrão no Yarn v4)
yarn install

# Forçar modo node_modules (se PnP causar problemas)
# Adicionar ao .yarnrc.yml:
# nodeLinker: node-modules
```

```yaml
# .yarnrc.yml — usar node_modules ao invés de PnP
nodeLinker: node-modules
```

### Zero-installs

Com PnP, é possível commitar o cache no repositório — assim, `yarn install` não precisa baixar nada:

```bash
# Adicionar ao .gitignore:
# .yarn/cache → NÃO ignorar (esse é o zero-install)
# .yarn/install-state.gz → ignorar

# .gitignore para zero-installs:
.pnp.*
.yarn/*
!.yarn/cache
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/sdks
!.yarn/versions
```

### Comandos específicos do Yarn

```bash
# Atualizar interativamente
yarn upgrade-interactive

# Patches (modificar pacotes)
yarn patch <pkg>                         # abre diretório temp para editar
yarn patch-commit <dir>                  # salva patch

# Constraints (validar dependências do monorepo)
yarn constraints

# Dedupe
yarn dedupe

# Info sobre pacote instalado
yarn info <pkg>

# Explicar por que pacote está instalado
yarn explain <pkg>
yarn why <pkg>

# Plugin system
yarn plugin import <plugin>
yarn plugin list
yarn plugin remove <plugin>

# Workspace tools
yarn workspaces foreach run build        # rodar em todos os workspaces
yarn workspaces list                     # listar workspaces
```

### Publicação (Yarn v4)

```bash
# No Yarn v4, publicação é via "yarn npm"
yarn npm login
yarn npm logout
yarn npm whoami
yarn npm publish
yarn npm audit
yarn npm info <pkg>
yarn npm tag add <pkg@ver> <tag>
yarn npm tag list <pkg>
```

---

## 📦 pnpm — Comandos Exclusivos e Recursos

### Content-addressable Store

O pnpm usa um **content-addressable store** global: todos os pacotes ficam em um único lugar (`~/.local/share/pnpm/store/`) e são linkados via hard links nos projetos. Isso significa:

- 📉 **Menos espaço em disco** — mesma versão de um pacote é armazenada uma única vez
- ⚡ **Instalação mais rápida** — copia via hard link é instantânea
- 🔒 **Strict por padrão** — apenas dependências declaradas no `package.json` são acessíveis

```bash
# Ver caminho do store
pnpm store path

# Ver status do store
pnpm store status

# Limpar pacotes não referenciados
pnpm store prune
```

### Estrutura de node_modules do pnpm

```
node_modules/
  .pnpm/                              # diretório virtual (todas as deps)
    express@4.18.0/
      node_modules/
        express/                      # conteúdo real (hard link do store)
        body-parser/                  # dependência do express
  express -> .pnpm/express@4.18.0/node_modules/express   # symlink
```

> Isso garante que `require('body-parser')` de dentro do seu código **falha** — porque body-parser não está no seu `package.json`. Isso é a "strictness" do pnpm.

### Comandos específicos do pnpm

```bash
# Store (cache global)
pnpm store path                          # onde fica o store
pnpm store status                        # verificar integridade
pnpm store prune                         # limpar pacotes não usados

# Importar de outro package manager
pnpm import                              # importa lockfile de npm/yarn

# Filtros (rodar em pacotes específicos)
pnpm --filter <pkg> install
pnpm --filter <pkg> run build
pnpm --filter "my-app..." run build      # my-app + dependências
pnpm --filter "...my-app" run test       # my-app + dependentes

# Recursivo (todos os workspaces)
pnpm -r run build                        # rodar em todos os workspaces
pnpm -r update                           # atualizar todos

# Verificar o que está desatualizado
pnpm outdated
pnpm outdated -r                         # em todos os workspaces

# Atualizar interativamente
pnpm update -i
pnpm update -i --latest                  # mostrar versões fora do range

# Explicar dependência
pnpm why <pkg>

# Audit
pnpm audit
pnpm audit --fix                         # atualiza deps vulneráveis

# Publicar
pnpm publish
pnpm publish --access=public
```

### .npmrc para pnpm

O pnpm usa o mesmo `.npmrc` do NPM, mas com opções adicionais:

```ini
# Auto-instalar peers (default no pnpm v8+)
auto-install-peers=true

# Permitir hoisting (relaxar strictness)
shamefully-hoist=true

# Store local (ao invés do global)
store-dir=.pnpm-store

# Strict peer dependencies
strict-peer-dependencies=true
```

---

## 🏗️ Workspaces (Monorepo)

Os 3 package managers suportam workspaces para monorepos.

### Configuração

```json
// package.json (raiz do monorepo)
{
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ]
}
```

Para **pnpm**, também é necessário criar `pnpm-workspace.yaml`:

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

### Operações em workspaces

| Operação | NPM | Yarn | pnpm |
|---|---|---|---|
| **Instalar tudo** | `npm install` | `yarn install` | `pnpm install` |
| **Rodar script em workspace** | `npm run build -w packages/core` | `yarn workspace packages/core build` | `pnpm --filter packages/core build` |
| **Rodar em todos** | `npm run build -ws` | `yarn workspaces foreach run build` | `pnpm -r run build` |
| **Adicionar dep em workspace** | `npm install express -w packages/api` | `yarn workspace packages/api add express` | `pnpm --filter packages/api add express` |
| **Listar workspaces** | `npm ls --workspaces` | `yarn workspaces list` | `pnpm -r ls --depth=0` |

---

## 📄 package.json — Referência

### Campos essenciais

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "description": "Descrição do projeto",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js",
    "build": "tsc",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

### Todos os campos

| Campo | O que é | Exemplo |
|---|---|---|
| `name` | Nome do pacote (lowercase, sem espaços) | `"my-app"` |
| `version` | Versão semver | `"1.0.0"` |
| `description` | Descrição curta | `"Um app legal"` |
| `main` | Entry point CommonJS | `"index.js"` |
| `module` | Entry point ESM (bundlers) | `"index.mjs"` |
| `type` | Sistema de módulos (`module` = ESM, `commonjs` = CJS) | `"module"` |
| `types` / `typings` | Entry point de tipos TypeScript | `"index.d.ts"` |
| `exports` | Entry points condicionais (Node v12+) | Veja abaixo |
| `scripts` | Comandos executáveis via `npm run` / `yarn` / `pnpm` | `{"start": "node app.js"}` |
| `dependencies` | Dependências de produção | `{"express": "^4.18.0"}` |
| `devDependencies` | Dependências de desenvolvimento | `{"typescript": "^5.0.0"}` |
| `peerDependencies` | Dependências que o consumidor precisa ter | `{"react": "^18.0.0"}` |
| `optionalDependencies` | Dependências opcionais (install não falha sem elas) | `{"fsevents": "^2.3.0"}` |
| `overrides` | Sobrescreve versões de deps transitivas (NPM) | Veja abaixo |
| `resolutions` | Sobrescreve versões de deps transitivas (Yarn) | Veja abaixo |
| `pnpm.overrides` | Sobrescreve versões de deps transitivas (pnpm) | Veja abaixo |
| `engines` | Versões requeridas de Node/NPM | `{"node": ">=20"}` |
| `packageManager` | Package manager + versão (Corepack) | `"yarn@4.9.1"` |
| `private` | Impede publicação acidental | `true` |
| `license` | Licença SPDX | `"MIT"` |
| `author` | Autor | `"Nome <email>"` |
| `repository` | Repositório | `{"type": "git", "url": "..."}` |
| `bugs` | URL do issue tracker | `{"url": "..."}` |
| `homepage` | URL da homepage | `"https://..."` |
| `keywords` | Palavras-chave para busca | `["api", "rest"]` |
| `files` | Arquivos incluídos no pacote publicado | `["dist", "README.md"]` |
| `bin` | CLIs executáveis | `{"my-cli": "./bin/cli.js"}` |
| `workspaces` | Workspaces (monorepo) | `["packages/*"]` |
| `browserslist` | Browsers alvo (Babel, PostCSS, etc.) | `["> 1%", "last 2 versions"]` |

### Semver (versionamento semântico)

| Símbolo | Significado | Exemplo | Resolve para |
|---|---|---|---|
| `^` | Compatible (major fixo) | `^4.18.0` | `>=4.18.0 <5.0.0` |
| `~` | Approximately (minor fixo) | `~4.18.0` | `>=4.18.0 <4.19.0` |
| `>=` | Maior ou igual | `>=4.18.0` | `>=4.18.0` |
| `*` | Qualquer versão | `*` | Última |
| `latest` | Tag latest no registry | `latest` | Última publicada |
| `1.2.3` | Versão exata | `1.2.3` | Somente `1.2.3` |
| `1.2.x` | Qualquer patch | `1.2.x` | `>=1.2.0 <1.3.0` |

> 💡 **Dica:** O `^` (padrão do `npm install`) é a opção mais comum e segura — aceita patches e minor updates.

### Overrides / Resolutions (sobrescrever deps transitivas)

```json
// NPM — overrides
{
  "overrides": {
    "semver": "7.5.4"
  }
}

// Yarn — resolutions
{
  "resolutions": {
    "semver": "7.5.4"
  }
}

// pnpm — pnpm.overrides
{
  "pnpm": {
    "overrides": {
      "semver": "7.5.4"
    }
  }
}
```

### Campo exports (entry points condicionais)

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./utils": {
      "import": "./dist/utils.mjs",
      "require": "./dist/utils.cjs"
    }
  }
}
```

---

## 📄 Arquivos de Configuração

### Por package manager

| Package Manager | Config do projeto | Config do usuário |
|---|---|---|
| NPM | `.npmrc` | `~/.npmrc` |
| Yarn (v4) | `.yarnrc.yml` | `~/.yarnrc.yml` |
| pnpm | `.npmrc` (mesmo do NPM) | `~/.npmrc` |

### .npmrc (NPM e pnpm)

```ini
# Registry customizado
registry=https://registry.npmjs.org/

# Registry com escopo
@myorg:registry=https://npm.myorg.com/

# Token de autenticação
//registry.npmjs.org/:_authToken=${NPM_TOKEN}

# Engine strict (falha se Node/NPM não satisfaz engines)
engine-strict=true

# Salvar versão exata (sem ^)
save-exact=true

# Nível de log
loglevel=warn

# Ignorar scripts de pós-instalação (segurança)
ignore-scripts=true

# pnpm específico
auto-install-peers=true
shamefully-hoist=true
```

### .yarnrc.yml (Yarn v4)

```yaml
# Node linker (PnP ou node_modules)
nodeLinker: pnp                          # padrão
# nodeLinker: node-modules               # fallback se PnP der problema

# Registry
npmRegistryServer: "https://registry.npmjs.org"

# Autenticação com escopo
npmScopes:
  myorg:
    npmRegistryServer: "https://npm.myorg.com"
    npmAuthToken: "${NPM_TOKEN}"

# Telemetria
enableTelemetry: false

# Plugins
plugins:
  - path: .yarn/plugins/@yarnpkg/plugin-interactive-tools.cjs
    spec: "@yarnpkg/plugin-interactive-tools"
```

### Gerenciar config via CLI

```bash
# NPM
npm config list
npm config get registry
npm config set registry https://registry.npmjs.org/
npm config edit

# Yarn
yarn config get nodeLinker
yarn config set nodeLinker node-modules

# pnpm (usa .npmrc)
pnpm config list
pnpm config get registry
pnpm config set registry https://registry.npmjs.org/
```

---

## 🔑 Variáveis de Ambiente

### Node.js

| Variável | O que faz | Padrão |
|---|---|---|
| `NODE_ENV` | Ambiente de execução (`development`, `production`, `test`) | — |
| `NODE_OPTIONS` | Flags adicionais para o Node | — |
| `NODE_PATH` | Diretórios extras para resolver módulos | — |
| `NODE_DEBUG` | Ativa debug de módulos internos | — |
| `NODE_EXTRA_CA_CERTS` | Caminho para CAs extras (SSL) | — |
| `NODE_NO_WARNINGS` | Suprime avisos | — |
| `NODE_REPL_HISTORY` | Caminho do histórico do REPL | `~/.node_repl_history` |
| `NODE_TLS_REJECT_UNAUTHORIZED` | `0` para ignorar erros SSL (⚠️ inseguro) | `1` |
| `UV_THREADPOOL_SIZE` | Tamanho do thread pool do libuv | `4` |

### NPM

| Variável | O que faz | Padrão |
|---|---|---|
| `NPM_TOKEN` | Token de autenticação para registry | — |
| `NPM_CONFIG_REGISTRY` | Registry padrão | `https://registry.npmjs.org/` |
| `NPM_CONFIG_LOGLEVEL` | Nível de log | `warn` |
| `NPM_CONFIG_FUND` | Mostrar mensagens de funding | `true` |
| `NPM_CONFIG_AUDIT` | Rodar audit após install | `true` |
| `NPM_CONFIG_SAVE_EXACT` | Salvar versão exata (sem `^`) | `false` |

### Yarn

| Variável | O que faz | Padrão |
|---|---|---|
| `YARN_RC_FILENAME` | Nome do arquivo de config | `.yarnrc.yml` |
| `YARN_ENABLE_TELEMETRY` | Ativar telemetria | `true` |
| `YARN_NPM_AUTH_TOKEN` | Token de autenticação | — |
| `YARN_NPM_REGISTRY_SERVER` | Registry padrão | `https://registry.npmjs.org` |
| `YARN_CACHE_FOLDER` | Caminho do cache | `.yarn/cache` |

### pnpm

| Variável | O que faz | Padrão |
|---|---|---|
| `PNPM_HOME` | Diretório de binários globais do pnpm | — |
| `npm_config_store_dir` | Caminho do content store | `~/.local/share/pnpm/store/` |

### Corepack

| Variável | O que faz | Padrão |
|---|---|---|
| `COREPACK_HOME` | Diretório de cache do Corepack | `~/Library/Caches/corepack` (macOS) |
| `COREPACK_ENABLE_STRICT` | Bloqueia PMs não definidos em `packageManager` | `0` |
| `COREPACK_NPM_REGISTRY` | Registry para baixar package managers | `https://registry.npmjs.org` |

### Uso

```bash
# Definir NODE_ENV (comum em scripts e CI)
NODE_ENV=production node app.js

# Passar flags extras via NODE_OPTIONS
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Autenticação no CI/CD
NPM_TOKEN=my-secret-token npm publish

# Desativar audit no install (mais rápido)
NPM_CONFIG_AUDIT=false npm install
```

---

## 📁 Caminhos dos Arquivos (macOS)

### Node.js (via NVM)

| O que | Caminho |
|---|---|
| Versões instaladas | `~/.nvm/versions/node/` |
| Binário do Node ativo | `~/.nvm/versions/node/v24.14.1/bin/node` |
| Binário do NPM ativo | `~/.nvm/versions/node/v24.14.1/bin/npm` |
| Binário do npx ativo | `~/.nvm/versions/node/v24.14.1/bin/npx` |
| Binário do Corepack ativo | `~/.nvm/versions/node/v24.14.1/bin/corepack` |
| Shims de Yarn/pnpm | `~/.nvm/versions/node/v<ver>/bin/yarn` |
| Pacotes globais (NPM) | `~/.nvm/versions/node/v24.14.1/lib/node_modules/` |
| REPL history | `~/.node_repl_history` |

### NPM

| O que | Caminho |
|---|---|
| Cache do NPM | `~/.npm/` |
| Config do usuário | `~/.npmrc` |
| Config do projeto | `./.npmrc` |
| Logs | `~/.npm/_logs/` |

### Yarn (v4)

| O que | Caminho |
|---|---|
| Cache do projeto | `.yarn/cache/` |
| Releases | `.yarn/releases/` |
| Config do projeto | `.yarnrc.yml` |
| Config do usuário | `~/.yarnrc.yml` |
| PnP map | `.pnp.cjs` |

### pnpm

| O que | Caminho |
|---|---|
| Content store | `~/.local/share/pnpm/store/` |
| Config | `~/.npmrc` (mesmo do NPM) |
| Virtual store (por projeto) | `./node_modules/.pnpm/` |

### Corepack

| O que | Caminho |
|---|---|
| Cache do Corepack | `~/Library/Caches/corepack/` |

### Projeto (todos os PMs)

| O que | Caminho |
|---|---|
| Dependências locais | `./node_modules/` |
| Definição de pacote | `./package.json` |
| Lockfile NPM | `./package-lock.json` |
| Lockfile Yarn | `./yarn.lock` |
| Lockfile pnpm | `./pnpm-lock.yaml` |
| Workspaces pnpm | `./pnpm-workspace.yaml` |

### Ver caminhos programaticamente

```bash
# Onde está o node
which node                               # ~/.nvm/versions/node/v24.14.1/bin/node

# Prefixo global do NPM
npm prefix -g

# Onde ficam pacotes globais
npm root -g

# Cache do NPM
npm config get cache                     # ~/.npm

# Store do pnpm
pnpm store path
```

---

## 🧹 Limpeza / Desinstalação

### Limpar cache

```bash
# NPM
npm cache clean --force
npm cache verify                         # verificar integridade

# Yarn
yarn cache clean

# pnpm
pnpm store prune                         # limpar pacotes não referenciados

# Corepack
corepack cache clean
```

### Limpar node_modules de um projeto

```bash
# Remover e reinstalar
rm -rf node_modules && npm install       # NPM
rm -rf node_modules && yarn install      # Yarn
rm -rf node_modules && pnpm install      # pnpm

# Instalação limpa (CI-style)
npm ci                                   # NPM
yarn install --immutable                 # Yarn
pnpm install --frozen-lockfile           # pnpm
```

### Remover pacotes globais

```bash
# NPM
npm ls -g --depth=0                      # listar
npm uninstall -g <pacote>                # remover

# pnpm
pnpm ls -g --depth=0
pnpm remove -g <pacote>
```

### Desinstalar Corepack

```bash
corepack disable
npm uninstall -g corepack                # se foi instalado via npm
```

> ⚠️ **Atenção:** Para desinstalar Node.js, use NVM: `nvm uninstall <version>`. Veja [NVM.md — Limpeza / Desinstalação](./NVM.md#-limpeza--desinstalação).

---

## 🔧 Troubleshooting

### npm install falha com EACCES (permissão)

```bash
# Se usar NVM, isso não deveria acontecer
# Verificar se está usando o Node do NVM
which node
# Deve retornar ~/.nvm/... (não /usr/local/...)
```

### Instalação demora muito

```bash
# NPM — desativar audit e fund
npm install --no-audit --no-fund

# Ou via .npmrc
echo "audit=false" >> .npmrc
echo "fund=false" >> .npmrc

# pnpm — geralmente já é mais rápido por causa do content store
```

### Conflito de dependências (ERESOLVE)

```bash
# NPM — forçar resolução (pode ter problemas)
npm install --legacy-peer-deps

# Ou resolver via overrides/resolutions no package.json
```

### node_modules corrompido

```bash
# Limpar e reinstalar
rm -rf node_modules package-lock.json && npm install    # NPM
rm -rf node_modules yarn.lock && yarn install           # Yarn
rm -rf node_modules pnpm-lock.yaml && pnpm install      # pnpm
```

### Pacote global não encontrado após trocar versão do Node

```bash
# Cada versão do Node tem seus próprios pacotes globais
# Solução: reinstalar na nova versão
npm install -g <pacote>

# Ou migrar pacotes ao instalar nova versão
nvm install 24 --reinstall-packages-from=22
```

### Corepack: "This project is configured to use yarn but..."

```bash
# Ativar Corepack
corepack enable

# Instalar a versão definida no package.json
corepack install
```

### Yarn PnP: pacote não encontrado

```bash
# Alguns pacotes não funcionam com PnP
# Solução 1: adicionar ao packageExtensions no .yarnrc.yml
# Solução 2: mudar para node_modules
yarn config set nodeLinker node-modules
yarn install
```

### pnpm: phantom dependency error

```bash
# pnpm é strict — não permite usar deps não declaradas
# Solução 1: adicionar a dependência ao package.json
pnpm add <pacote>

# Solução 2: relaxar strictness (não recomendado)
echo "shamefully-hoist=true" >> .npmrc
pnpm install
```

### Diagnóstico geral

```bash
# NPM
npm doctor

# Verificar tudo de uma vez
node --version && npm --version && corepack --version
```

---

## 💡 Dicas Úteis / Receitas

### Verificar versões de tudo

```bash
node --version && npm --version && npx --version && corepack --version
```

### Aliases para o shell

```bash
# Adicionar ao ~/.zshrc
alias ni='npm install'
alias nid='npm install -D'
alias nig='npm install -g'
alias nu='npm uninstall'
alias nr='npm run'
alias ns='npm start'
alias nt='npm test'
alias nls='npm ls --depth=0'
alias nlsg='npm ls -g --depth=0'
alias nout='npm outdated'
```

### Atualizar todas as dependências para latest

```bash
# Via npx (funciona com qualquer PM)
npx npm-check-updates -u
npm install                              # ou yarn / pnpm install

# Interativamente
npx npm-check-updates -i
```

### Publicar um pacote

```bash
# NPM
npm login && npm publish

# Yarn
yarn npm login && yarn npm publish

# pnpm
pnpm login && pnpm publish

# Dry-run
npm publish --dry-run
```

### Migrar entre package managers

```bash
# De NPM para pnpm
rm -rf node_modules package-lock.json
pnpm import                              # importa do package-lock.json existente
pnpm install
corepack use pnpm@10.33.0

# De NPM para Yarn
rm -rf node_modules package-lock.json
corepack use yarn@4.9.1
yarn install

# De Yarn/pnpm para NPM
rm -rf node_modules yarn.lock pnpm-lock.yaml .yarn .pnp.cjs
npm install
# Remover "packageManager" do package.json se existir
```

### Escolher package manager para projeto novo

```bash
# NPM (já é o padrão, não precisa de nada)
npm init -y

# Yarn via Corepack
corepack enable
corepack use yarn@4.9.1
yarn install

# pnpm via Corepack
corepack enable
corepack use pnpm@10.33.0
pnpm install
```

### Community / Links úteis

- [nodejs.org](https://nodejs.org) — Site oficial do Node.js
- [docs.npmjs.com](https://docs.npmjs.com) — Documentação do NPM
- [npmjs.com](https://www.npmjs.com) — Registry de pacotes
- [yarnpkg.com](https://yarnpkg.com) — Documentação do Yarn
- [pnpm.io](https://pnpm.io) — Documentação do pnpm
- [nodejs.org/en/about/releases](https://nodejs.org/en/about/releases/) — Schedule de releases
- [github.com/nodejs/corepack](https://github.com/nodejs/corepack) — Repositório do Corepack

---

## 📚 Referência Completa de Comandos CLI

### Node.js

```
node
  <file>                           Execute JavaScript file
  -e, --eval "code"                Evaluate code inline
  -p, --print "expr"               Evaluate and print expression
  -c, --check                      Syntax check without executing
  -r, --require <module>           Preload CommonJS module
  --import <module>                Preload ESM module
  --watch                          Auto-restart on file changes
  --watch-path=<dir>               Watch specific directory
  --env-file=<path>                Load env vars from file
  --inspect[=host:port]            Enable inspector (default: 127.0.0.1:9229)
  --inspect-brk[=host:port]       Inspect and break on first line
  --experimental-strip-types       Enable TypeScript support
  --max-old-space-size=<MB>        Set V8 heap memory limit
  --enable-source-maps             Enable source maps in stack traces
  --no-warnings                    Suppress warnings
  --trace-warnings                 Show warning stack traces
  -v, --version                    Print Node.js version
  -h, --help                       Print help
```

### NPM

```
npm
  init [-y]                        Create package.json
  install [<pkg>]                  Install packages
    -D, --save-dev                 Save as devDependency
    -g, --global                   Install globally
    --omit=dev                     Skip devDependencies
    --legacy-peer-deps             Ignore peer dep conflicts
  ci                               Clean install from lockfile
  uninstall <pkg> [-g]             Remove package
  update [<pkg>] [-g]              Update packages
  outdated                         Check for outdated packages
  ls [--depth=0] [-g]              List installed packages
  run <script> [-- args]           Run named script
  start / test / restart / stop    Run lifecycle scripts
  exec [-- <cmd>]                  Execute package binary
  link [<pkg>]                     Symlink package
  pack                             Create tarball
  publish [--tag] [--access]       Publish to registry
  login / logout / whoami          Registry auth
  audit [fix] [signatures]         Security audit
  view <pkg> [field]               View registry info
  search <term>                    Search registry
  docs / repo / bugs <pkg>         Open in browser
  explain <pkg>                    Why is pkg installed
  dedupe                           Remove duplicates
  prune                            Remove extraneous
  rebuild                          Rebuild native modules
  version [major|minor|patch]      Bump version
  config [list|get|set|delete]     Manage config
  cache [clean|verify]             Manage cache
  doctor                           Check environment
  pkg [get|set|delete]             Manage package.json
  prefix [-g] / root [-g]          Print paths
  sbom                             Generate SBOM
  fund                             Show funding info
  diff                             Show package diff
  deprecate / undeprecate          Manage deprecation
  dist-tag [add|rm|ls]             Manage dist tags
  access / owner / team / org      Manage permissions
  token [create|list|revoke]       Manage auth tokens
  --version                        Print npm version
```

### npx

```
npx <pkg>[@<version>] [args...]
  -p, --package=<pkg>              Package(s) to install
  -c, --call=<cmd>                 Execute command string
  -y, --yes                        Skip confirmation prompt
  --no                             Only run if locally installed
  -w, --workspace=<name>           Run in specific workspace
```

### Yarn (v4)

```
yarn
  install [--immutable]            Install dependencies
  add <pkg> [-D] [-P] [-O]        Add package
  remove <pkg>                     Remove package
  up [<pkg>]                       Update packages
  upgrade-interactive              Interactive update
  run <script>                     Run script
  <script>                         Run script (shorthand)
  dlx <pkg>                        Execute package without installing
  info <pkg>                       Show package info
  why <pkg>                        Why is package installed
  explain <pkg>                    Explain dependency
  dedupe                           Remove duplicates
  rebuild                          Rebuild native modules
  link / unlink                    Symlink packages
  pack                             Create tarball
  patch <pkg>                      Create patch
  patch-commit <dir>               Apply patch
  workspace <ws> <cmd>             Run in workspace
  workspaces foreach <cmd>         Run in all workspaces
  workspaces list                  List workspaces
  config [get|set]                 Manage configuration
  cache clean                      Clean cache
  plugin [import|list|remove]      Manage plugins
  constraints                      Validate monorepo
  npm login / logout / whoami      Registry auth
  npm publish                      Publish package
  npm audit                        Security audit
  npm info <pkg>                   View registry info
  npm tag [add|list|remove]        Manage dist tags
  --version                        Print Yarn version
```

### pnpm

```
pnpm
  install [--frozen-lockfile]      Install dependencies
  add <pkg> [-D] [-g]             Add package
  remove <pkg> [-g]               Remove package
  update [<pkg>] [-i] [-g]        Update packages
  outdated [-r]                    Check for outdated packages
  run <script>                     Run script
  <script>                         Run script (shorthand)
  dlx <pkg>                        Execute package without installing
  ls [--depth=0] [-g]             List installed packages
  why <pkg>                        Why is package installed
  rebuild                          Rebuild native modules
  link / unlink                    Symlink packages
  pack                             Create tarball
  publish [--access]               Publish to registry
  login / logout / whoami          Registry auth
  audit [--fix]                    Security audit
  view <pkg>                       View registry info
  import                           Import lockfile from npm/yarn
  store path                       Show store location
  store status                     Check store integrity
  store prune                      Clean unused packages
  --filter <pattern>               Filter packages
  -r, --recursive                  Run in all workspaces
  config [list|get|set|delete]     Manage config
  --version                        Print pnpm version
```

### Corepack

```
corepack
  enable [--install-directory]     Enable shims for yarn/pnpm
  disable [--install-directory]    Disable shims
  install                          Install PM from packageManager field
  install -g <pm@version>          Install PM globally
  use <pm@version>                 Set packageManager in package.json
  up                               Update PM to latest
  pack                             Pack PM to .tgz
  cache clean                      Clean Corepack cache
```
