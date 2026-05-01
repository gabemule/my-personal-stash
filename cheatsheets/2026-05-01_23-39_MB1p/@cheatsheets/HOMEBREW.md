# 🍺 Homebrew — Cheat Sheet Completo

> Referência rápida para o gerenciador de pacotes do macOS (e Linux).
> Baseado na documentação oficial: [docs.brew.sh](https://docs.brew.sh) | Homebrew v5.1+

---

## 📋 Índice

- [Terminologia](#-terminologia)
- [Tabela Geral de Comandos](#-tabela-geral-de-comandos)
- [Instalação e Atualização do Brew](#-instalação-e-atualização-do-brew)
- [Buscar Pacotes](#-buscar-pacotes)
- [Instalar Pacotes](#-instalar-pacotes)
- [Atualizar Pacotes](#-atualizar-pacotes)
- [Remover Pacotes](#-remover-pacotes)
- [Listar e Inspecionar](#-listar-e-inspecionar)
- [Dependências](#-dependências)
- [Serviços](#-serviços)
- [Taps (Repositórios)](#-taps-repositórios)
- [Bundle (Brewfile)](#-bundle-brewfile)
- [Pin (Travar Versão)](#-pin-travar-versão)
- [Limpeza](#-limpeza)
- [Casks (Apps GUI)](#-casks-apps-gui)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Caminhos dos Arquivos (macOS)](#-caminhos-dos-arquivos-macos)
- [Brew vs NVM vs NPM](#-brew-vs-nvm-vs-npm)
- [Troubleshooting](#-troubleshooting)
- [Dicas Úteis / Receitas](#-dicas-úteis--receitas)

---

## 📖 Terminologia

Antes de tudo, é importante entender os termos do Homebrew:

| Termo | O que é |
|---|---|
| **Formula** | Definição de pacote que compila a partir do código-fonte |
| **Cask** | Definição de pacote que instala binários pré-compilados (apps GUI) |
| **Bottle** | Formula pré-compilada (binário pronto, não precisa compilar) |
| **Tap** | Repositório Git de formulae/casks (fonte de pacotes) |
| **Keg** | Diretório de instalação de uma versão específica de uma formula |
| **Rack** | Diretório contendo uma ou mais versões (kegs) de uma formula |
| **Cellar** | Diretório contendo todos os racks (`/opt/homebrew/Cellar`) |
| **Caskroom** | Diretório contendo todos os casks (`/opt/homebrew/Caskroom`) |
| **Prefix** | Diretório raiz do Homebrew (`/opt/homebrew` no Apple Silicon) |
| **Keg-only** | Formula que **não** é linkada no prefix (evita conflito com sistema) |
| **Leaves** | Pacotes instalados diretamente por você (não são dependências de outros) |
| **Opt prefix** | Symlink para a versão ativa de um keg (`/opt/homebrew/opt/foo`) |

---

## 📊 Tabela Geral de Comandos

### Comandos Essenciais

| Comando | O que faz |
|---|---|
| `brew install <pkg>` | Instala uma formula ou cask |
| `brew uninstall <pkg>` | Remove uma formula ou cask |
| `brew update` | Atualiza o Homebrew e os catálogos de fórmulas |
| `brew upgrade` | Atualiza todos os pacotes desatualizados |
| `brew upgrade <pkg>` | Atualiza um pacote específico |
| `brew search <texto>` | Busca pacotes por nome |
| `brew info <pkg>` | Mostra informações detalhadas de um pacote |
| `brew list` | Lista todos os pacotes instalados |
| `brew outdated` | Lista pacotes desatualizados |
| `brew cleanup` | Remove versões antigas e cache |
| `brew doctor` | Diagnostica problemas na instalação |
| `brew config` | Mostra configuração do Homebrew |
| `brew --version` | Mostra a versão do Homebrew |
| `brew help` | Mostra a ajuda |

### Gerenciamento de Pacotes

| Comando | O que faz |
|---|---|
| `brew install <formula>` | Instala formula (CLI tool / lib) |
| `brew install --cask <cask>` | Instala cask (app GUI) |
| `brew reinstall <pkg>` | Reinstala um pacote |
| `brew uninstall <pkg>` | Remove um pacote |
| `brew upgrade` | Atualiza todos os pacotes |
| `brew upgrade <pkg>` | Atualiza pacote específico |
| `brew upgrade --dry-run` | Simula atualização (sem fazer nada) |
| `brew pin <formula>` | Trava versão (não atualiza com `upgrade`) |
| `brew unpin <formula>` | Destrava versão |
| `brew link <formula>` | Cria symlinks no prefix |
| `brew unlink <formula>` | Remove symlinks do prefix |
| `brew switch <formula> <ver>` | Troca para outra versão instalada |

### Listar e Inspecionar

| Comando | O que faz |
|---|---|
| `brew list` | Lista todas as formulae instaladas |
| `brew list --cask` | Lista todos os casks instalados |
| `brew list <formula>` | Lista arquivos instalados de uma formula |
| `brew info <pkg>` | Mostra info detalhada (versão, deps, tamanho) |
| `brew outdated` | Lista pacotes desatualizados |
| `brew leaves` | Lista pacotes "folha" (instalados por você, não são deps) |
| `brew deps <formula>` | Lista dependências de uma formula |
| `brew deps --tree <formula>` | Lista dependências em árvore |
| `brew uses <formula>` | Lista quem depende dessa formula |
| `brew desc <formula>` | Mostra descrição curta |
| `brew home <formula>` | Abre site oficial no navegador |
| `brew cat <formula>` | Mostra o código-fonte da formula |

### Serviços

| Comando | O que faz |
|---|---|
| `brew services list` | Lista serviços gerenciados |
| `brew services info <svc>` | Mostra info de um serviço |
| `brew services start <svc>` | Inicia serviço e registra no boot |
| `brew services stop <svc>` | Para serviço e remove do boot |
| `brew services restart <svc>` | Reinicia serviço |
| `brew services run <svc>` | Roda serviço sem registrar no boot |
| `brew services kill <svc>` | Mata serviço forçosamente |

### Taps

| Comando | O que faz |
|---|---|
| `brew tap` | Lista taps ativos |
| `brew tap <user/repo>` | Adiciona um tap (repositório de fórmulas) |
| `brew untap <user/repo>` | Remove um tap |
| `brew tap-info <tap>` | Mostra info de um tap |

### Sistema / Limpeza

| Comando | O que faz |
|---|---|
| `brew update` | Atualiza Homebrew + catálogos |
| `brew cleanup` | Remove versões antigas e cache |
| `brew cleanup -n` | Simula cleanup (dry-run) |
| `brew cleanup -s` | Remove tudo, incluindo downloads de versões atuais |
| `brew autoremove` | Remove dependências órfãs |
| `brew doctor` | Diagnostica problemas |
| `brew config` | Mostra configuração |
| `brew --prefix` | Mostra diretório de instalação |
| `brew --cellar` | Mostra diretório do Cellar |
| `brew --caskroom` | Mostra diretório do Caskroom |
| `brew --cache` | Mostra diretório de cache |
| `brew --repository` | Mostra diretório do repositório Homebrew |

### Bundle (Brewfile)

| Comando | O que faz |
|---|---|
| `brew bundle dump` | Gera Brewfile com tudo instalado |
| `brew bundle` | Instala tudo do Brewfile |
| `brew bundle cleanup` | Remove pacotes que não estão no Brewfile |
| `brew bundle check` | Verifica se Brewfile está satisfeito |
| `brew bundle list` | Lista pacotes do Brewfile |

---

## 🚀 Instalação e Atualização do Brew

### Instalar Homebrew

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Após instalar no Apple Silicon, adicione ao `~/.zprofile`:

```bash
eval "$(/opt/homebrew/bin/brew shellenv)"
```

### Verificar instalação

```bash
brew --version
# Homebrew 5.1.5

brew doctor
# Your system is ready to brew.
```

### Atualizar o Homebrew

```bash
# Atualiza o Homebrew em si + catálogos de fórmulas
brew update

# Ver o que mudou
brew update --verbose
```

> 💡 O Homebrew faz auto-update antes de certos comandos (install, upgrade, tap). Controlável via `HOMEBREW_AUTO_UPDATE_SECS`.

---

## 🔍 Buscar Pacotes

```bash
# Buscar por nome
brew search node

# Buscar com regex
brew search /^node/

# Buscar apenas formulae
brew search --formula node

# Buscar apenas casks
brew search --cask chrome

# Buscar por descrição
brew search --desc "version manager"

# Ver info de um pacote
brew info node
brew info --cask docker

# Abrir site oficial
brew home node

# Ver fórmula (código-fonte)
brew cat node
```

---

## 📦 Instalar Pacotes

### Formulae (CLI tools / libs)

```bash
# Instalar formula
brew install git
brew install node
brew install python@3.12

# Instalar versão específica (se disponível como formula separada)
brew install postgresql@14

# Instalar de source (compilar, não usar bottle)
brew install --build-from-source <formula>

# Instalar sem linkar (keg-only manual)
brew install <formula>
brew unlink <formula>

# Instalar com opções verbose/debug
brew install --verbose --debug <formula>
```

### Casks (apps GUI)

```bash
# Instalar cask
brew install --cask docker
brew install --cask visual-studio-code
brew install --cask google-chrome

# Adotar app existente (já instalado fora do brew)
brew install --cask --adopt <cask>

# Instalar sem binários de helper
brew install --cask --no-binaries <cask>
```

### Linkar / Deslinkar

```bash
# Linkar formula (criar symlinks no prefix)
brew link node

# Forçar link (se houver conflito)
brew link --overwrite node

# Deslinkar (remover symlinks, mantém instalado)
brew unlink node

# Ver se está linkado
ls -la $(brew --prefix)/bin/node
```

---

## 🔄 Atualizar Pacotes

```bash
# Atualizar o Homebrew + catálogos
brew update

# Ver o que está desatualizado
brew outdated

# Ver com detalhes (versão atual vs nova)
brew outdated --verbose

# Atualizar TUDO (formulae + casks)
brew upgrade

# Simular atualização (dry-run)
brew upgrade --dry-run

# Atualizar pacote específico
brew upgrade git
brew upgrade --cask docker

# Atualizar e perguntar confirmação antes
brew upgrade --ask

# Atualizar apenas formulae (sem casks)
brew upgrade --formula

# Atualizar apenas casks
brew upgrade --cask
```

> ⚠️ **Atenção:** `brew update` atualiza o **Homebrew em si** e os catálogos. `brew upgrade` atualiza os **pacotes instalados**. São comandos diferentes!

---

## 🗑️ Remover Pacotes

```bash
# Remover pacote
brew uninstall node

# Remover pacote + todos os arquivos relacionados (casks)
brew uninstall --zap --cask docker

# Remover dependências órfãs (não usadas por ninguém)
brew autoremove

# Simular autoremove (dry-run)
brew autoremove --dry-run

# Remover versões antigas (mantém apenas a mais recente)
brew cleanup

# Simular cleanup
brew cleanup -n
```

### Entendendo a remoção

```bash
# 1. Desinstalar o pacote principal
brew uninstall ffmpeg

# 2. Remover deps que ficaram órfãs
brew autoremove
# Remove: x264, x265, dav1d, opus, etc. (se ninguém mais usa)

# 3. Limpar cache
brew cleanup
```

> 💡 **Dica:** `brew uninstall` remove **só** o pacote. `brew autoremove` é o que remove as dependências órfãs depois.

---

## 🔍 Listar e Inspecionar

### Listar pacotes instalados

```bash
# Listar todas as formulae
brew list
brew list --formula

# Listar todos os casks
brew list --cask

# Listar com versões
brew list --versions

# Listar apenas pacotes "leaves" (instalados por você)
brew leaves

# Listar arquivos de uma formula específica
brew list git
```

### Inspecionar pacotes

```bash
# Info completa de uma formula
brew info git
# Mostra: versão, descrição, deps, tamanho, caveats

# Info de um cask
brew info --cask docker

# Info em JSON
brew info --json=v2 git

# Descrição curta
brew desc git

# Ver todas as descrições
brew desc --search "database"

# Ver log de instalação (se tiver problemas)
brew log git
```

### Verificar o que está desatualizado

```bash
# Lista simples
brew outdated

# Com versões
brew outdated --verbose

# Apenas formulae
brew outdated --formula

# Apenas casks
brew outdated --cask
```

---

## 🌳 Dependências

```bash
# Listar dependências de uma formula
brew deps node

# Listar dependências diretas (não recursivas)
brew deps --direct node

# Listar em formato de árvore
brew deps --tree node

# Listar dependências de TODOS os pacotes instalados
brew deps --installed

# Listar em árvore todos os instalados
brew deps --installed --tree

# Ver quem depende de uma formula (dependentes reversos)
brew uses openssl@3
brew uses --installed openssl@3       # apenas entre os instalados

# Verificar dependências faltantes
brew missing
```

### Entendendo leaves vs dependências

```bash
# Leaves = pacotes que VOCÊ instalou (ninguém depende deles)
brew leaves

# Tudo instalado (leaves + dependências)
brew list

# Ver a diferença
echo "Leaves: $(brew leaves | wc -l | tr -d ' ')"
echo "Total:  $(brew list --formula | wc -l | tr -d ' ')"
echo "Deps:   $(($(brew list --formula | wc -l) - $(brew leaves | wc -l)))"
```

---

## ⚙️ Serviços

O Homebrew gerencia serviços via `launchctl` no macOS (equivalente ao `systemd` no Linux).

```bash
# Listar todos os serviços
brew services list

# Info de um serviço
brew services info postgresql@14

# Iniciar serviço (registra no boot)
brew services start postgresql@14
brew services start redis

# Parar serviço (remove do boot)
brew services stop postgresql@14

# Reiniciar serviço
brew services restart redis

# Rodar serviço SEM registrar no boot (one-time)
brew services run postgresql@14

# Matar serviço forçosamente
brew services kill postgresql@14

# Iniciar/parar TODOS os serviços
brew services start --all
brew services stop --all

# Listar em JSON
brew services list --json
```

### Onde ficam os arquivos de serviço

| Tipo | Caminho |
|---|---|
| Serviços do usuário | `~/Library/LaunchAgents/` |
| Serviços do sistema (sudo) | `/Library/LaunchDaemons/` |

```bash
# Ver arquivo plist de um serviço
cat ~/Library/LaunchAgents/homebrew.mxcl.redis.plist
```

---

## 📂 Taps (Repositórios)

Taps são repositórios Git que contêm formulae e casks adicionais.

```bash
# Listar taps ativos
brew tap

# Adicionar um tap
brew tap homebrew/cask-fonts
brew tap user/repo

# Adicionar tap de URL customizada
brew tap user/repo https://github.com/user/homebrew-repo.git

# Remover tap
brew untap homebrew/cask-fonts

# Info de um tap
brew tap-info homebrew/core

# Buscar qual tap contém uma formula
brew which-formula node
```

### Taps padrão

| Tap | O que contém |
|---|---|
| `homebrew/core` | Formulae oficiais (~7000+) |
| `homebrew/cask` | Casks oficiais (apps GUI) |

---

## 📄 Bundle (Brewfile)

O `brew bundle` permite criar um **Brewfile** que funciona como "snapshot" de todos os pacotes instalados — útil para backup, migração e reprodução de ambientes.

### Criar Brewfile

```bash
# Gerar Brewfile com TUDO instalado
brew bundle dump

# Gerar com descrições
brew bundle dump --describe

# Gerar em caminho específico
brew bundle dump --file=~/Brewfile

# Forçar sobrescrita
brew bundle dump --force
```

### Exemplo de Brewfile

```ruby
# Taps
tap "homebrew/core"
tap "homebrew/cask"

# Formulae
brew "awscli"
brew "cmake"
brew "croc"
brew "git"
brew "go"
brew "llama.cpp"
brew "nvm"
brew "postgresql@14", restart_service: true
brew "pyenv"
brew "redis", restart_service: true
brew "yarn"

# Casks
cask "claude-code"
cask "dbeaver-community"
cask "docker"
cask "mactex-no-gui"
```

### Usar Brewfile

```bash
# Instalar tudo do Brewfile
brew bundle

# Instalar de arquivo específico
brew bundle --file=~/Brewfile

# Verificar se tudo está instalado
brew bundle check

# Listar o que está no Brewfile
brew bundle list

# Remover pacotes que NÃO estão no Brewfile
brew bundle cleanup

# Simular remoção (dry-run)
brew bundle cleanup --dry-run

# Forçar remoção
brew bundle cleanup --force
```

> 💡 **Dica:** Mantenha seu Brewfile em um repo Git (dotfiles) para reproduzir seu ambiente em qualquer Mac novo.

---

## 📌 Pin (Travar Versão)

Pinar um pacote impede que ele seja atualizado com `brew upgrade`.

```bash
# Pinar (travar versão)
brew pin postgresql@14

# Ver pacotes pinados
brew list --pinned

# Despinar (permitir atualização)
brew unpin postgresql@14
```

> 💡 **Quando usar:** Quando um pacote atualizado pode quebrar seus projetos (ex: `postgresql@14` → `postgresql@17` mudaria a versão major do banco).

---

## 🧹 Limpeza

```bash
# Remover versões antigas de formulae e casks + cache antigo
brew cleanup

# Simular (ver o que seria removido)
brew cleanup -n
brew cleanup --dry-run

# Limpar tudo, incluindo cache de versões atuais
brew cleanup -s

# Limpar pacote específico
brew cleanup git

# Remover dependências órfãs
brew autoremove

# Simular autoremove
brew autoremove --dry-run

# Ver uso de disco do cache
du -sh $(brew --cache)

# Limpeza completa
brew autoremove && brew cleanup -s
```

### Limpeza automática

O Homebrew roda `cleanup` automaticamente a cada 30 dias após `install`, `upgrade` ou `reinstall`. Controlável via `HOMEBREW_CLEANUP_PERIODIC_FULL_DAYS`.

---

## 🖥️ Casks (Apps GUI)

Casks são pacotes de aplicativos com interface gráfica (`.app`, `.dmg`, `.pkg`).

```bash
# Buscar casks
brew search --cask chrome

# Instalar cask
brew install --cask google-chrome

# Listar casks instalados
brew list --cask

# Info de um cask
brew info --cask docker

# Atualizar casks
brew upgrade --cask

# Atualizar cask específico
brew upgrade --cask docker

# Remover cask
brew uninstall --cask google-chrome

# Remover cask + todos os dados (zap)
brew uninstall --zap --cask google-chrome

# Adotar app já instalado manualmente
brew install --cask --adopt slack
```

---

## 🔑 Variáveis de Ambiente

### Principais

| Variável | O que faz | Padrão |
|---|---|---|
| `HOMEBREW_AUTO_UPDATE_SECS` | Intervalo de auto-update (segundos) | `86400` (24h) |
| `HOMEBREW_NO_AUTO_UPDATE` | Desativa auto-update completamente | — |
| `HOMEBREW_NO_INSTALL_CLEANUP` | Não rodar cleanup após install/upgrade | — |
| `HOMEBREW_CLEANUP_MAX_AGE_DAYS` | Remove cache mais antigo que N dias | `120` |
| `HOMEBREW_CLEANUP_PERIODIC_FULL_DAYS` | Intervalo de cleanup automático | `30` |
| `HOMEBREW_NO_ENV_HINTS` | Esconde dicas de variáveis de ambiente | — |
| `HOMEBREW_NO_INSECURE_REDIRECT` | Não permite redirects inseguros | — |
| `HOMEBREW_ASK` | Pede confirmação antes de instalar/upgrade | — |

### Cache / Downloads

| Variável | O que faz | Padrão |
|---|---|---|
| `HOMEBREW_CACHE` | Diretório de cache | `~/Library/Caches/Homebrew` |
| `HOMEBREW_BOTTLE_DOMAIN` | Mirror para download de bottles | `https://ghcr.io/v2/homebrew/core` |
| `HOMEBREW_ARTIFACT_DOMAIN` | Prefixo para todos os downloads | — |
| `HOMEBREW_DOWNLOAD_CONCURRENCY` | Conexões paralelas de download | `auto` (2x CPUs) |

### Repositórios

| Variável | O que faz | Padrão |
|---|---|---|
| `HOMEBREW_BREW_GIT_REMOTE` | Remote Git do Homebrew/brew | `https://github.com/Homebrew/brew` |
| `HOMEBREW_CORE_GIT_REMOTE` | Remote Git do homebrew-core | `https://github.com/Homebrew/homebrew-core` |
| `HOMEBREW_API_DOMAIN` | URL da API JSON do Homebrew | `https://formulae.brew.sh/api` |
| `HOMEBREW_API_AUTO_UPDATE_SECS` | Intervalo de auto-update da API | `450` |

### Debug / Dev

| Variável | O que faz | Padrão |
|---|---|---|
| `HOMEBREW_DEBUG` | Ativa modo debug | — |
| `HOMEBREW_VERBOSE` | Ativa modo verbose | — |
| `HOMEBREW_DEVELOPER` | Modo desenvolvedor (warnings → errors) | — |
| `HOMEBREW_DISPLAY_INSTALL_TIMES` | Mostra tempo de instalação | — |
| `HOMEBREW_EDITOR` | Editor padrão para `brew edit` | `$EDITOR` |
| `HOMEBREW_BAT` | Usar `bat` para `brew cat` | — |
| `HOMEBREW_COLOR` | Forçar output colorido | — |

### Restrições

| Variável | O que faz | Padrão |
|---|---|---|
| `HOMEBREW_ALLOWED_TAPS` | Lista de taps permitidos | — |
| `HOMEBREW_FORBIDDEN_FORMULAE` | Formulae proibidas | — |
| `HOMEBREW_FORBIDDEN_CASKS` | Casks proibidos | — |
| `HOMEBREW_FORBIDDEN_LICENSES` | Licenças SPDX proibidas | — |

### Configuração via arquivo

As variáveis podem ser definidas em arquivos (sem `export`):

| Escopo | Arquivo |
|---|---|
| Sistema | `/etc/homebrew/brew.env` |
| Prefix | `/opt/homebrew/etc/homebrew/brew.env` |
| Usuário | `~/.homebrew/brew.env` ou `$XDG_CONFIG_HOME/homebrew/brew.env` |

Prioridade: usuário > prefix > sistema.

```bash
# Exemplo de ~/.homebrew/brew.env
HOMEBREW_NO_AUTO_UPDATE=1
HOMEBREW_NO_ENV_HINTS=1
HOMEBREW_CLEANUP_MAX_AGE_DAYS=60
```

---

## 📁 Caminhos dos Arquivos (macOS)

### Apple Silicon (M1/M2/M3/M4)

| O que | Caminho |
|---|---|
| Prefix (raiz do Homebrew) | `/opt/homebrew/` |
| Cellar (formulae instaladas) | `/opt/homebrew/Cellar/` |
| Caskroom (casks instalados) | `/opt/homebrew/Caskroom/` |
| Binários linkados | `/opt/homebrew/bin/` |
| Opt (symlinks para versões ativas) | `/opt/homebrew/opt/` |
| Repositório do Homebrew | `/opt/homebrew/Library/` |
| Taps | `/opt/homebrew/Library/Taps/` |
| Cache de downloads | `~/Library/Caches/Homebrew/` |
| Logs | `~/Library/Logs/Homebrew/` |
| Serviços do usuário (LaunchAgents) | `~/Library/LaunchAgents/` |
| Serviços do sistema (LaunchDaemons) | `/Library/LaunchDaemons/` |
| Config de variáveis (usuário) | `~/.homebrew/brew.env` |

### Intel Mac

| O que | Caminho |
|---|---|
| Prefix | `/usr/local/` |
| Cellar | `/usr/local/Cellar/` |
| Caskroom | `/usr/local/Caskroom/` |
| Binários | `/usr/local/bin/` |

### Ver caminhos programaticamente

```bash
brew --prefix                    # /opt/homebrew
brew --cellar                    # /opt/homebrew/Cellar
brew --caskroom                  # /opt/homebrew/Caskroom
brew --cache                     # ~/Library/Caches/Homebrew
brew --repository                # /opt/homebrew

# Caminho de uma formula específica
brew --prefix git                # /opt/homebrew/opt/git
brew --cellar git                # /opt/homebrew/Cellar/git
```

### Ver espaço usado

```bash
# Espaço total do Homebrew
du -sh /opt/homebrew/

# Espaço do Cellar (formulae)
du -sh /opt/homebrew/Cellar/

# Espaço por formula (top 10 maiores)
du -sh /opt/homebrew/Cellar/* | sort -rh | head -10

# Espaço do cache
du -sh $(brew --cache)

# Espaço do Caskroom
du -sh /opt/homebrew/Caskroom/
```

---

## 🔀 Brew vs NVM vs NPM

Entender a relação entre Homebrew, NVM e NPM é essencial para se organizar:

### O que cada um gerencia

| Gerenciador | O que gerencia | Escopo |
|---|---|---|
| **Homebrew** | Pacotes do sistema (CLI tools, libs, apps GUI) | Global do macOS |
| **NVM** | Versões do Node.js | Por usuário / por shell |
| **NPM** | Pacotes JavaScript | Global por versão do Node / local por projeto |

### Fluxo recomendado

```
Homebrew → instala NVM
  └── NVM → instala/gerencia versões do Node.js
        └── NPM → vem junto com cada versão do Node
              └── NPM → instala pacotes JS (globais ou por projeto)
```

### Onde cada coisa fica instalada

| O que | Onde fica |
|---|---|
| Homebrew formulae | `/opt/homebrew/Cellar/` |
| Homebrew casks | `/opt/homebrew/Caskroom/` |
| NVM | `~/.nvm/` |
| Versões do Node (via NVM) | `~/.nvm/versions/node/` |
| Pacotes globais npm | `~/.nvm/versions/node/v<ver>/lib/node_modules/` |
| Pacotes locais npm | `./node_modules/` (no projeto) |

### Regras de ouro

1. **NVM** gerencia o Node, **não** o Homebrew
   - `brew install nvm` ✅ (instala o NVM em si)
   - `brew install node` ❌ (conflita com NVM — use `nvm install node`)

2. **NPM global** é por versão do Node
   - Se trocar de `nvm use 20` para `nvm use 22`, pacotes globais mudam

3. **NPM local** é por projeto
   - `package.json` + `node_modules/` — isolado, não depende de brew/nvm

### Se tiver `node` instalado via Homebrew e via NVM

```bash
# Verificar de onde vem o node
which node

# Se vier de /opt/homebrew → instalado via Homebrew (pode conflitar)
# Se vier de ~/.nvm → instalado via NVM (correto)

# Remover o node do Homebrew (se usar NVM)
brew uninstall node
```

> ⚠️ **Atenção:** Ter `node` instalado via Homebrew **e** via NVM ao mesmo tempo pode causar conflitos de PATH. Escolha um só.

---

## 🔧 Troubleshooting

### Diagnosticar problemas

```bash
# Diagnóstico completo
brew doctor

# Ver configuração
brew config

# Ver variáveis de ambiente
brew --env
```

### `brew doctor` reporta problemas

```bash
# Seguir as instruções do doctor
brew doctor

# Problemas comuns:
# "Warning: Unbrewed dylibs were found in /usr/local/lib"
# → Libs instaladas fora do brew

# "Warning: You have unlinked kegs in your Cellar"
brew link <formula>

# "Warning: Some installed formulae are missing dependencies"
brew install $(brew missing | awk '{print $2}')
```

### Pacote não encontrado

```bash
# Atualizar catálogos
brew update

# Buscar em todos os taps
brew search <pacote>
```

### Permissão negada

```bash
# Corrigir permissões do Homebrew
sudo chown -R $(whoami) /opt/homebrew/

# Ou só do Cellar
sudo chown -R $(whoami) /opt/homebrew/Cellar/
```

### Instalação travou / corrompeu

```bash
# Reinstalar o pacote
brew reinstall <formula>

# Se não funcionar, forçar
brew uninstall --force <formula>
brew install <formula>

# Limpar cache se tiver arquivo corrompido
brew cleanup -s
```

### Brew lento (auto-update demora)

```bash
# Desativar auto-update
export HOMEBREW_NO_AUTO_UPDATE=1

# Ou aumentar o intervalo (ex: 1 semana)
export HOMEBREW_AUTO_UPDATE_SECS=604800
```

### Conflito de versão / keg-only

```bash
# Formula keg-only não é linkada automaticamente
# Para forçar o link:
brew link --force <formula>

# Ou usar diretamente do keg:
/opt/homebrew/opt/<formula>/bin/<comando>

# Exemplo com icu4c:
/opt/homebrew/opt/icu4c@74/bin/icu-config
```

### zsh compinit: insecure directories

```bash
# Problema do Homebrew com zsh, não do brew em si
compaudit
chmod 755 /opt/homebrew/share/zsh/site-functions
chmod 755 /opt/homebrew/share/zsh
```

---

## 💡 Dicas Úteis / Receitas

### Atualizar tudo de uma vez

```bash
brew update && brew upgrade && brew autoremove && brew cleanup
```

### Backup completo (Brewfile)

```bash
# Gerar Brewfile com descrições
brew bundle dump --describe --force --file=~/Brewfile

# Restaurar em outro Mac
brew bundle --file=~/Brewfile
```

### Ver o que você instalou (não dependências)

```bash
brew leaves
```

### Ver quais pacotes ocupam mais espaço

```bash
du -sh /opt/homebrew/Cellar/* | sort -rh | head -20
```

### Desinstalar pacote + suas dependências órfãs

```bash
brew uninstall <pacote> && brew autoremove
```

### Verificar se um pacote está instalado via script

```bash
if brew list --formula | grep -q "^git$"; then
  echo "git está instalado"
else
  echo "git NÃO está instalado"
fi
```

### Listar todos os serviços com status

```bash
brew services list
```

### Instalar versão específica (quando formula versionada existe)

```bash
# PostgreSQL 14 (existe como formula separada)
brew install postgresql@14

# Python 3.12
brew install python@3.12
```

### Listar pacotes instalados que NÃO estão no Brewfile

```bash
brew bundle cleanup --dry-run
```

### Aliases úteis para o shell

```bash
# Adicionar ao ~/.zshrc
alias brewup='brew update && brew upgrade && brew autoremove && brew cleanup'
alias brewout='brew outdated'
alias brewleaves='brew leaves'
alias brewdeps='brew deps --installed --tree'
```

### Community / Links úteis

- [docs.brew.sh](https://docs.brew.sh) — Documentação oficial
- [formulae.brew.sh](https://formulae.brew.sh) — Busca de formulae e casks
- [GitHub](https://github.com/Homebrew/brew) — Repositório do Homebrew
- [Discourse](https://github.com/orgs/Homebrew/discussions) — Discussões da comunidade

---

## 📚 Referência Completa de Comandos CLI

```
brew
  --version                       Print Homebrew version
  --prefix [formula]              Print Homebrew prefix path
  --cellar [formula]              Print Cellar path
  --caskroom [cask]               Print Caskroom path
  --cache                         Print cache path
  --repository                    Print repository path
  --env                           Print Homebrew environment
  help [command]                  Show help

  install <formula|cask>          Install a package
    --cask                        Install as cask
    --build-from-source / -s      Compile from source
    --force-bottle                Force bottle install
    --adopt                       Adopt existing app (cask)
    --no-binaries                 Skip helper binaries (cask)
  uninstall <formula|cask>        Uninstall a package
    --force                       Force uninstall
    --zap                         Remove all associated files (cask)
  reinstall <formula|cask>        Reinstall a package

  update                          Update Homebrew + catalogs
    --verbose                     Show detailed output
  upgrade [formula|cask]          Upgrade packages
    --dry-run                     Simulate upgrade
    --formula                     Only upgrade formulae
    --cask                        Only upgrade casks
    --ask                         Ask confirmation before upgrading

  search <text|/regex/>           Search for packages
    --formula                     Search formulae only
    --cask                        Search casks only
    --desc                        Search by description
  info <formula|cask>             Show package info
    --json=v2                     Output as JSON

  list [formula|cask]             List installed packages
    --formula                     List formulae only
    --cask                        List casks only
    --versions                    Show versions
    --pinned                      Show pinned only
  outdated                        List outdated packages
    --verbose                     Show versions
    --formula / --cask            Filter by type
  leaves                          List non-dependency packages

  deps <formula>                  List dependencies
    --direct                      Direct dependencies only
    --tree                        Show as tree
    --installed                   Only installed packages
  uses <formula>                  List dependents (reverse deps)
    --installed                   Only installed packages
  missing                         List missing dependencies
  desc <formula>                  Show short description

  pin <formula>                   Prevent upgrade
  unpin <formula>                 Allow upgrade

  link <formula>                  Create symlinks in prefix
    --overwrite                   Force overwrite
  unlink <formula>                Remove symlinks

  services list                   List managed services
  services info <svc>             Show service info
  services start <svc>            Start + register at boot
  services stop <svc>             Stop + unregister from boot
  services restart <svc>          Restart service
  services run <svc>              Start without registering
  services kill <svc>             Force kill service

  tap [user/repo]                 List or add taps
  untap <user/repo>               Remove a tap
  tap-info <tap>                  Show tap info

  bundle dump                     Generate Brewfile
    --describe                    Include descriptions
    --force                       Overwrite existing
    --file=<path>                 Custom file path
  bundle [install]                Install from Brewfile
  bundle check                    Verify Brewfile is satisfied
  bundle cleanup                  Remove unlisted packages
  bundle list                     List Brewfile packages

  cleanup [formula]               Remove old versions + cache
    -n / --dry-run                Simulate cleanup
    -s                            Remove all cache
  autoremove                      Remove orphan dependencies
    --dry-run                     Simulate removal

  doctor                          Diagnose issues
  config                          Show configuration
  home <formula>                  Open homepage in browser
  cat <formula>                   Show formula source
  log <formula>                   Show git log for formula
  edit <formula>                  Edit formula source
  fetch <formula>                 Download without installing
  which-formula <cmd>             Find which formula provides cmd
  commands                        List all available commands
```
