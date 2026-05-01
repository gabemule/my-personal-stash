# 📦 NVM (Node Version Manager) — Cheat Sheet Completo

> Referência rápida para gerenciar múltiplas versões do Node.js via linha de comando.
> Baseado na documentação oficial: [github.com/nvm-sh/nvm](https://github.com/nvm-sh/nvm) | NVM v0.40.4+

---

## 📋 Índice

- [Tabela Geral de Comandos](#-tabela-geral-de-comandos)
- [Instalação e Atualização](#-instalação-e-atualização)
- [Gerenciamento de Versões do Node](#-gerenciamento-de-versões-do-node)
- [Trocar entre Versões](#-trocar-entre-versões)
- [Aliases](#-aliases)
- [LTS (Long-term Support)](#-lts-long-term-support)
- [Arquivo .nvmrc](#-arquivo-nvmrc)
- [Auto-switch ao Entrar em Diretórios](#-auto-switch-ao-entrar-em-diretórios)
- [NPM — Pacotes Globais](#-npm--pacotes-globais)
- [Cache](#-cache)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Caminhos dos Arquivos (macOS)](#-caminhos-dos-arquivos-macos)
- [Bash Completion](#-bash-completion)
- [Cores Customizadas](#-cores-customizadas)
- [Limpeza / Desinstalação](#-limpeza--desinstalação)
- [Troubleshooting](#-troubleshooting)
- [Dicas Úteis / Receitas](#-dicas-úteis--receitas)

---

## 📊 Tabela Geral de Comandos

### Comandos Principais

| Comando | O que faz |
|---|---|
| `nvm install <version>` | Baixa e instala uma versão do Node |
| `nvm uninstall <version>` | Remove uma versão instalada |
| `nvm use <version>` | Troca para uma versão do Node na shell atual |
| `nvm current` | Mostra a versão ativa no momento |
| `nvm ls` | Lista versões instaladas localmente |
| `nvm ls-remote` | Lista versões disponíveis para download |
| `nvm alias <name> <version>` | Cria um alias para uma versão |
| `nvm unalias <name>` | Remove um alias |
| `nvm run <version> [args]` | Executa `node` com a versão especificada |
| `nvm exec <version> <command>` | Executa um comando com a versão especificada no PATH |
| `nvm which <version>` | Mostra o caminho do binário da versão |
| `nvm --version` | Mostra a versão do NVM instalada |
| `nvm --help` | Mostra a ajuda completa |

### Gerenciamento de Versões

| Comando | O que faz |
|---|---|
| `nvm install node` | Instala a versão mais recente do Node |
| `nvm install --lts` | Instala a versão LTS mais recente |
| `nvm install 22` | Instala a versão mais recente da linha 22.x |
| `nvm install 22.22.2` | Instala a versão exata |
| `nvm install --lts=jod` | Instala a LTS da linha "Jod" |
| `nvm uninstall 22.22.2` | Remove uma versão específica |
| `nvm uninstall --lts` | Remove a versão LTS (alias `lts/*`) |

### Trocar / Usar Versões

| Comando | O que faz |
|---|---|
| `nvm use node` | Usa a versão mais recente |
| `nvm use --lts` | Usa a versão LTS mais recente |
| `nvm use 22` | Usa a versão mais recente da linha 22.x |
| `nvm use system` | Usa a versão do sistema (não gerenciada pelo NVM) |
| `nvm use` | Usa a versão definida no `.nvmrc` |
| `nvm current` | Mostra qual versão está ativa |
| `nvm deactivate` | Desativa o NVM, restaura o PATH original |

### Listar Versões

| Comando | O que faz |
|---|---|
| `nvm ls` | Lista versões instaladas localmente |
| `nvm ls 22` | Lista versões 22.x instaladas |
| `nvm ls --no-alias` | Lista sem mostrar aliases |
| `nvm ls --no-colors` | Lista sem cores |
| `nvm ls-remote` | Lista todas as versões disponíveis para download |
| `nvm ls-remote --lts` | Lista apenas versões LTS remotas |
| `nvm ls-remote --lts=jod` | Lista versões de uma linha LTS específica |
| `nvm ls-remote 22` | Lista versões 22.x disponíveis |
| `nvm version <version>` | Resolve descrição para versão local exata |
| `nvm version-remote <version>` | Resolve descrição para versão remota exata |

### Aliases

| Comando | O que faz |
|---|---|
| `nvm alias` | Lista todos os aliases |
| `nvm alias <pattern>` | Lista aliases que começam com `<pattern>` |
| `nvm alias <name> <version>` | Cria alias apontando para uma versão |
| `nvm alias default <version>` | Define versão padrão para novas shells |
| `nvm unalias <name>` | Remove um alias |

### Execução

| Comando | O que faz |
|---|---|
| `nvm run <version> app.js` | Executa `node app.js` com a versão especificada |
| `nvm run --lts app.js` | Executa com a versão LTS |
| `nvm exec <version> node app.js` | Executa comando com PATH apontando para a versão |
| `nvm exec --lts npm test` | Executa `npm test` com a versão LTS |
| `nvm which <version>` | Mostra o caminho do executável do Node |
| `nvm which current` | Mostra o caminho do Node ativo |

### NPM / Pacotes Globais

| Comando | O que faz |
|---|---|
| `nvm install-latest-npm` | Atualiza npm para a última versão compatível |
| `nvm install --reinstall-packages-from=<v>` | Instala versão e migra pacotes globais |
| `nvm reinstall-packages <version>` | Reinstala pacotes globais de outra versão |
| `npm list -g --depth=0` | Lista pacotes globais da versão ativa |
| `npm uninstall -g <package>` | Remove pacote global |

### Cache / Sistema

| Comando | O que faz |
|---|---|
| `nvm cache dir` | Mostra caminho do diretório de cache |
| `nvm cache clear` | Limpa o cache de downloads |
| `nvm unload` | Remove o NVM da sessão do shell |

---

## 🚀 Instalação e Atualização

### Instalar NVM

```bash
# Via curl (recomendado)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash

# Via wget
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
```

O script clona o repositório em `~/.nvm` e adiciona as seguintes linhas ao seu profile (`~/.zshrc`, `~/.bashrc`, `~/.profile`, etc.):

```bash
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
```

### Verificar instalação

```bash
command -v nvm
# Deve retornar: nvm

nvm --version
# Deve retornar: 0.40.4
```

> ⚠️ **Atenção:** `which nvm` **não funciona** porque o NVM é uma função de shell (source), não um binário executável.

### Atualizar NVM

Basta rodar o mesmo comando de instalação — ele atualiza automaticamente:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
```

### Instalar via Git

```bash
# Clonar repositório
cd ~/ && git clone https://github.com/nvm-sh/nvm.git .nvm

# Checkout da versão mais recente
cd ~/.nvm && git checkout v0.40.4

# Ativar
. ./nvm.sh
```

Depois adicione ao seu `~/.zshrc` (ou `~/.bashrc`):

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
```

### Atualizar via Git

```bash
(
  cd "$NVM_DIR"
  git fetch --tags origin
  git checkout `git describe --abbrev=0 --tags --match "v[0-9]*" $(git rev-list --tags --max-count=1)`
) && \. "$NVM_DIR/nvm.sh"
```

### Instalar em Docker

```dockerfile
# Use bash for the shell
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Create a script file sourced by both interactive and non-interactive bash shells
ENV BASH_ENV ~/.bash_env
RUN touch "${BASH_ENV}"
RUN echo '. "${BASH_ENV}"' >> ~/.bashrc

# Download and install nvm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | PROFILE="${BASH_ENV}" bash
RUN echo node > .nvmrc
RUN nvm install
```

### Instalar em Docker para CI/CD

```dockerfile
FROM ubuntu:latest
ARG NODE_VERSION=20

# install curl
RUN apt update && apt install curl -y

# install nvm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash

# set env
ENV NVM_DIR=/root/.nvm

# install node
RUN bash -c "source $NVM_DIR/nvm.sh && nvm install $NODE_VERSION"

# set ENTRYPOINT for reloading nvm-environment
ENTRYPOINT ["bash", "-c", "source $NVM_DIR/nvm.sh && exec \"$@\"", "--"]

# set cmd to bash
CMD ["/bin/bash"]
```

```bash
# Build com versão customizada
docker build -t nvmimage --build-arg NODE_VERSION=22 .
```

---

## 📦 Gerenciamento de Versões do Node

### Instalar versões

```bash
# Instalar a versão mais recente (latest)
nvm install node

# Instalar a versão LTS mais recente
nvm install --lts

# Instalar versão específica
nvm install 22.22.2

# Instalar a mais recente da linha major
nvm install 22                       # mais recente 22.x.x
nvm install 20                       # mais recente 20.x.x

# Instalar LTS de uma linha específica
nvm install --lts=jod                # mais recente da linha "Jod" (v22.x)
nvm install --lts=iron               # mais recente da linha "Iron" (v20.x)
nvm install 'lts/*'                  # equivalente a --lts

# Instalar de source (compilação local)
nvm install -s 22.22.2

# Instalar apenas de binário (sem compilar)
nvm install -b 22.22.2

# Instalar e definir como default
nvm install 22 --default

# Instalar e salvar no .nvmrc
nvm install 22 --save

# Instalar e criar alias
nvm install 22 --alias=meu-projeto

# Instalar e atualizar npm para a última versão compatível
nvm install 22 --latest-npm

# Instalar sem barra de progresso
nvm install 22 --no-progress

# Instalar sem pacotes default
nvm install 22 --skip-default-packages

# Instalar e migrar pacotes globais de outra versão
nvm install 22 --reinstall-packages-from=20

# Instalar offline (de cache local)
nvm install --offline 22
nvm install --offline --lts
```

### Desinstalar versões

```bash
# Remover versão específica
nvm uninstall 22.22.2

# Remover versão LTS
nvm uninstall --lts
nvm uninstall --lts=jod
```

> ⚠️ **Atenção:** Não é possível desinstalar a versão atualmente ativa. Troque para outra com `nvm use` antes.

### Listar versões disponíveis

```bash
# Listar versões instaladas localmente
nvm ls

# Listar apenas versões de uma linha específica
nvm ls 22

# Listar sem cores
nvm ls --no-colors

# Listar sem aliases
nvm ls --no-alias

# Listar versões remotas disponíveis para download
nvm ls-remote

# Listar apenas LTS remotas
nvm ls-remote --lts

# Listar LTS de uma linha específica
nvm ls-remote --lts=jod

# Listar versões remotas de uma linha major
nvm ls-remote 22

# Resolver versão local
nvm version 22                       # ex: v22.22.2

# Resolver versão remota
nvm version-remote 22               # ex: v22.22.2
nvm version-remote --lts             # resolve a LTS mais recente
```

### Linhas LTS do Node.js

| Codinome | Versão Major | Status |
|---|---|---|
| Krypton | v24.x | **LTS Atual** |
| Jod | v22.x | LTS Ativo |
| Iron | v20.x | LTS Manutenção |
| Hydrogen | v18.x | End of Life |
| Gallium | v16.x | End of Life |
| Fermium | v14.x | End of Life |

> A tabela reflete o estado atual. Consulte [nodejs.org/en/about/releases](https://nodejs.org/en/about/releases/) para o schedule atualizado.

---

## 🔄 Trocar entre Versões

```bash
# Usar a versão mais recente instalada
nvm use node

# Usar a versão LTS mais recente instalada
nvm use --lts
nvm use --lts=jod

# Usar versão específica
nvm use 22.22.2

# Usar a mais recente da linha major
nvm use 22

# Usar a versão do sistema (fora do NVM)
nvm use system

# Usar a versão definida no .nvmrc
nvm use

# Usar silenciosamente (sem output)
nvm use 22 --silent

# Usar e salvar no .nvmrc
nvm use 22 --save

# Ver qual versão está ativa
nvm current

# Ver o caminho do binário node
nvm which 22
nvm which current
nvm which system

# Desativar NVM (restaura PATH original)
nvm deactivate
nvm deactivate --silent

# Executar com versão específica (sem trocar)
nvm run 22 --version                # executa: node --version
nvm run 22 app.js                   # executa: node app.js
nvm run --lts app.js

# Executar comando arbitrário com versão específica
nvm exec 22 node app.js
nvm exec 22 npm test
nvm exec --lts npm run build
```

> **Importante:** `nvm use` só afeta a **shell atual**. Cada nova janela/aba de terminal usa a versão `default`.

---

## 🏷️ Aliases

### Aliases built-in

| Alias | O que faz |
|---|---|
| `node` | Aponta para a versão mais recente instalada |
| `stable` | Alias para `node` (deprecated, era usado no Node v0.12 e anterior) |
| `unstable` | Aponta para Node v0.11 (última versão "unstable") |
| `iojs` | Aponta para a versão mais recente do io.js |
| `system` | Versão do Node instalada fora do NVM |
| `default` | Versão usada em novas shells |
| `lts/*` | LTS mais recente |
| `lts/<codename>` | LTS de uma linha específica (ex: `lts/jod`, `lts/iron`) |

### Gerenciar aliases customizados

```bash
# Listar todos os aliases
nvm alias

# Listar aliases que começam com um padrão
nvm alias my

# Criar alias
nvm alias meu-projeto 22.22.2

# Criar alias para versão major (resolve para a mais recente)
nvm alias dev 22

# Definir a versão padrão (usado em novas shells)
nvm alias default 22
nvm alias default node               # sempre a mais recente
nvm alias default --lts              # sempre a LTS mais recente

# Usar alias
nvm use meu-projeto

# Remover alias
nvm unalias meu-projeto
```

> ⚠️ **Atenção:** Aliases não podem conter espaços ou barras.

> 💡 **Dica:** A **primeira versão instalada** automaticamente vira o `default`.

---

## 🔒 LTS (Long-term Support)

Todas as operações que aceitam `<version>` também aceitam argumentos LTS:

```bash
# Instalar
nvm install --lts                    # LTS mais recente
nvm install --lts=jod                # LTS da linha "Jod"
nvm install 'lts/*'                  # equivalente a --lts
nvm install lts/iron                 # LTS da linha "Iron"

# Usar
nvm use --lts
nvm use --lts=jod
nvm use 'lts/*'
nvm use lts/iron

# Desinstalar
nvm uninstall --lts
nvm uninstall --lts=jod

# Executar
nvm run --lts app.js
nvm exec --lts npm test

# Listar remotas
nvm ls-remote --lts
nvm ls-remote --lts=jod

# Resolver versão
nvm version-remote --lts
nvm version-remote --lts=jod

# Instalar LTS mais recente e migrar pacotes globais
nvm install --reinstall-packages-from=current 'lts/*'
```

---

## 📄 Arquivo .nvmrc

O arquivo `.nvmrc` permite definir a versão do Node.js por projeto. Os comandos `nvm use`, `nvm install`, `nvm exec`, `nvm run` e `nvm which` usam a versão do `.nvmrc` se nenhuma versão for passada na linha de comando.

### Criar .nvmrc

```bash
# Versão específica
echo "22.22.2" > .nvmrc

# Versão major (resolve para a mais recente instalada)
echo "22" > .nvmrc

# Sempre a versão mais recente
echo "node" > .nvmrc

# Sempre a LTS mais recente
echo "lts/*" > .nvmrc

# LTS de uma linha específica
echo "lts/jod" > .nvmrc

# Salvar a versão atual automaticamente
nvm use --save                       # salva a versão ativa no .nvmrc
nvm install 22 --save                # instala e salva
```

### Usar .nvmrc

```bash
# Instala a versão do .nvmrc (baixa se necessário)
nvm install

# Troca para a versão do .nvmrc (precisa estar instalada)
nvm use

# Executa com a versão do .nvmrc
nvm run app.js
nvm exec npm test
```

### Formato do .nvmrc

- Deve conter **exatamente uma versão** seguida de newline
- Suporta comentários com `#`
- Ignora linhas em branco e espaços no início/fim
- Suporta pares chave=valor (reservado para uso futuro)
- O NVM busca o `.nvmrc` **subindo na árvore de diretórios** (sobe do diretório atual até encontrar um)

```bash
# Validar um .nvmrc
npx nvmrc
```

### Exemplo de .nvmrc

```
# Node version for this project
22
```

---

## 🔀 Auto-switch ao Entrar em Diretórios

Por padrão, o NVM **não troca automaticamente** de versão ao entrar em um diretório com `.nvmrc`. Você precisa configurar um hook no shell.

### zsh (recomendado para macOS)

Adicione ao final do `~/.zshrc` (**depois** da inicialização do NVM):

```zsh
# place this after nvm initialization!
autoload -U add-zsh-hook

load-nvmrc() {
  local nvmrc_path
  nvmrc_path="$(nvm_find_nvmrc)"

  if [ -n "$nvmrc_path" ]; then
    local nvmrc_node_version
    nvmrc_node_version=$(nvm version "$(cat "${nvmrc_path}")")

    if [ "$nvmrc_node_version" = "N/A" ]; then
      nvm install
    elif [ "$nvmrc_node_version" != "$(nvm version)" ]; then
      nvm use
    fi
  elif [ -n "$(PWD=$OLDPWD nvm_find_nvmrc)" ] && [ "$(nvm version)" != "$(nvm version default)" ]; then
    echo "Reverting to nvm default version"
    nvm use default
  fi
}

add-zsh-hook chpwd load-nvmrc
load-nvmrc
```

### bash

Adicione ao final do `~/.bashrc`:

```bash
cdnvm() {
    command cd "$@" || return $?
    nvm_path="$(nvm_find_up .nvmrc | command tr -d '\n')"

    # If there are no .nvmrc file, use the default nvm version
    if [[ ! $nvm_path = *[^[:space:]]* ]]; then

        declare default_version
        default_version="$(nvm version default)"

        # If there is no default version, set it to `node`
        # This will use the latest version on your machine
        if [ $default_version = 'N/A' ]; then
            nvm alias default node
            default_version=$(nvm version default)
        fi

        # If the current version is not the default version, set it to use the default version
        if [ "$(nvm current)" != "${default_version}" ]; then
            nvm use default
        fi
    elif [[ -s "${nvm_path}/.nvmrc" && -r "${nvm_path}/.nvmrc" ]]; then
        declare nvm_version
        nvm_version=$(<"${nvm_path}"/.nvmrc)

        declare locally_resolved_nvm_version
        # `nvm ls` will check all locally-available versions
        # If there are multiple matching versions, take the latest one
        # Remove the `->` and `*` characters and spaces
        # `locally_resolved_nvm_version` will be `N/A` if no local versions are found
        locally_resolved_nvm_version=$(nvm ls --no-colors "${nvm_version}" | command tail -1 | command tr -d '\->*' | command tr -d '[:space:]')

        # If it is not already installed, install it
        # `nvm install` will implicitly use the newly-installed version
        if [ "${locally_resolved_nvm_version}" = 'N/A' ]; then
            nvm install "${nvm_version}";
        elif [ "$(nvm current)" != "${locally_resolved_nvm_version}" ]; then
            nvm use "${nvm_version}";
        fi
    fi
}

alias cd='cdnvm'
cdnvm "$PWD" || exit
```

### fish

Requer [bass](https://github.com/edc/bass) instalado.

```fish
# ~/.config/fish/functions/nvm.fish
function nvm
  bass source ~/.nvm/nvm.sh --no-use ';' nvm $argv
end

# ~/.config/fish/functions/nvm_find_nvmrc.fish
function nvm_find_nvmrc
  bass source ~/.nvm/nvm.sh --no-use ';' nvm_find_nvmrc
end

# ~/.config/fish/functions/load_nvm.fish
function load_nvm --on-variable="PWD"
  set -l default_node_version (nvm version default)
  set -l node_version (nvm version)
  set -l nvmrc_path (nvm_find_nvmrc)
  if test -n "$nvmrc_path"
    set -l nvmrc_node_version (nvm version (cat $nvmrc_path))
    if test "$nvmrc_node_version" = "N/A"
      nvm install (cat $nvmrc_path)
    else if test "$nvmrc_node_version" != "$node_version"
      nvm use $nvmrc_node_version
    end
  else if test "$node_version" != "$default_node_version"
    echo "Reverting to default Node version"
    nvm use default
  end
end

# ~/.config/fish/config.fish
# You must call it on initialization or listening to directory switching won't work
load_nvm > /dev/stderr
```

### Alternativa: zsh-nvm plugin

Se usa Oh My Zsh ou similar:

```bash
# Instalar o plugin zsh-nvm (suporta auto-use nativo)
# Adicionar zsh-nvm ao seu .zshrc plugins
# Configurar auto-use:
export NVM_AUTO_USE=true
```

### Alternativa: nvshim

```bash
# nvshim cria shims para node, npm, npx que detectam .nvmrc automaticamente
# https://github.com/iamogbz/nvshim
npm install -g nvshim
```

---

## 📦 NPM — Pacotes Globais

> ⚠️ **Cada versão do Node tem seus próprios pacotes globais.** Ao trocar de versão com `nvm use`, os pacotes globais mudam junto.

### Listar pacotes globais

```bash
# Lista pacotes globais da versão ativa (nível raiz)
npm list -g --depth=0

# Lista com todas as dependências
npm list -g

# Lista em formato parseable (útil para scripts)
npm list -g --depth=0 --parseable
```

### Instalar / Remover pacotes globais

```bash
# Instalar pacote global (na versão do Node ativa)
npm install -g typescript

# Remover pacote global
npm uninstall -g typescript

# Remover vários de uma vez
npm uninstall -g pacote1 pacote2 pacote3

# Remover TODOS os pacotes globais
npm list -g --depth=0 --parseable | tail -n +2 | xargs npm uninstall -g
```

### Migrar pacotes globais entre versões

```bash
# Instalar nova versão e migrar pacotes globais da versão atual
nvm install 22 --reinstall-packages-from=current

# Migrar de uma versão específica
nvm install 22 --reinstall-packages-from=20

# Migrar pacotes de uma versão para a versão ativa
nvm reinstall-packages 20

# Instalar LTS e migrar pacotes + atualizar npm
nvm install --reinstall-packages-from=current --latest-npm 'lts/*'
```

> ⚠️ **Atenção:** `--reinstall-packages-from` **não atualiza o npm**. Use `--latest-npm` junto se quiser.

### Atualizar npm

```bash
# Atualizar npm para a última versão compatível com o Node ativo
nvm install-latest-npm
```

### Pacotes globais padrão

Crie o arquivo `$NVM_DIR/default-packages` para instalar pacotes automaticamente a cada `nvm install`:

```bash
# Criar/editar o arquivo
cat > ~/.nvm/default-packages << 'EOF'
typescript
eslint
prettier
npm-check-updates
EOF
```

Toda vez que você rodar `nvm install`, esses pacotes serão instalados junto.

Para pular os pacotes padrão em uma instalação:

```bash
nvm install 22 --skip-default-packages
```

---

## 🗄️ Cache

```bash
# Ver diretório de cache
nvm cache dir

# Limpar cache de downloads
nvm cache clear
```

> 💡 Se uma instalação falhar com erros como `curl: (33) HTTP server doesn't seem to support byte ranges. Cannot resume.`, limpe o cache com `nvm cache clear` e tente novamente.

### Instalação offline (usando cache)

```bash
# Se a versão já foi baixada antes (está no cache)
nvm install --offline 22

# Offline com LTS (precisa ter rodado nvm ls-remote --lts antes)
nvm install --offline --lts
```

---

## 🔑 Variáveis de Ambiente

### Variáveis expostas pelo NVM

| Variável | O que faz |
|---|---|
| `NVM_DIR` | Diretório de instalação do NVM (padrão: `~/.nvm`) |
| `NVM_BIN` | Onde `node`, `npm` e pacotes globais da versão ativa ficam |
| `NVM_INC` | Diretório de includes do Node (útil para C/C++ addons) |
| `NVM_CD_FLAGS` | Mantém compatibilidade com zsh |
| `NVM_RC_VERSION` | Versão lida do `.nvmrc` (se estiver sendo usada) |

### Variáveis de configuração

| Variável | O que faz | Padrão |
|---|---|---|
| `NVM_DIR` | Onde o NVM é instalado | `~/.nvm` |
| `NVM_NODEJS_ORG_MIRROR` | Mirror para download de binários do Node | `https://nodejs.org/dist` |
| `NVM_IOJS_ORG_MIRROR` | Mirror para download de binários do io.js | `https://iojs.org/dist` |
| `NVM_SYMLINK_CURRENT` | Cria symlink `current` (útil para IDEs) | `false` |
| `NVM_COLORS` | Cores customizadas para output (5 códigos) | `bygre` |
| `NVM_AUTH_HEADER` | Header de autenticação para mirror | — |
| `NVM_AUTO_USE` | Auto-use ao entrar em diretório (plugin zsh-nvm) | `false` |

### Uso

```bash
# Usar mirror customizado
export NVM_NODEJS_ORG_MIRROR=https://nodejs.org/dist
nvm install node

# Ou temporariamente
NVM_NODEJS_ORG_MIRROR=https://nodejs.org/dist nvm install 22

# Criar symlink "current" (útil para IDEs)
export NVM_SYMLINK_CURRENT=true

# Passar header de autenticação para mirror privado
NVM_AUTH_HEADER="Bearer secret-token" nvm install node

# Adicionar ao ~/.zshrc para persistir
export NVM_DIR="$HOME/.nvm"
export NVM_SYMLINK_CURRENT=true
export NVM_COLORS='cmgRY'
```

> ⚠️ **Atenção:** `NVM_SYMLINK_CURRENT=true` pode causar race conditions se múltiplas abas do terminal usarem `nvm use` ao mesmo tempo.

### O que o NVM modifica

O NVM modifica as seguintes variáveis do sistema quando troca de versão:
- `PATH` — sempre
- `MANPATH` — se presente
- `NODE_PATH` — se presente

---

## 📁 Caminhos dos Arquivos (macOS)

| O que | Caminho |
|---|---|
| Instalação do NVM | `~/.nvm/` |
| Script principal | `~/.nvm/nvm.sh` |
| Bash completion | `~/.nvm/bash_completion` |
| Versões do Node instaladas | `~/.nvm/versions/node/` |
| Binários de uma versão | `~/.nvm/versions/node/v22.22.2/bin/` |
| Pacotes globais de uma versão | `~/.nvm/versions/node/v22.22.2/lib/node_modules/` |
| Aliases | `~/.nvm/alias/` |
| Aliases LTS (gerenciados pelo NVM) | `~/.nvm/alias/lts/` |
| Pacotes padrão para novas instalações | `~/.nvm/default-packages` |
| Cache de downloads | `~/.nvm/.cache/` |
| Config do shell (zsh) | `~/.zshrc` |
| Config do shell (bash) | `~/.bashrc` ou `~/.bash_profile` |

### Ver espaço usado

```bash
# Espaço total do NVM
du -sh ~/.nvm/

# Espaço por versão instalada
du -sh ~/.nvm/versions/node/*

# Listar versões com tamanho
ls -lh ~/.nvm/versions/node/
```

---

## ⌨️ Bash Completion

Para ativar autocomplete, adicione ao seu profile (`~/.bashrc`, `~/.bash_profile`):

```bash
[[ -r $NVM_DIR/bash_completion ]] && \. $NVM_DIR/bash_completion
```

### O que o completion oferece

```
nvm <Tab>
→ alias cache current deactivate exec help install install-latest-npm
  list list-remote ls ls-remote reinstall-packages run unalias
  uninstall unload use version version-remote which

nvm alias <Tab>
→ default iojs lts/* lts/argon lts/boron ... node stable unstable

nvm use <Tab>
→ my_alias default v20.20.1 v22.22.2 v24.14.1

nvm uninstall <Tab>
→ v20.20.1 v22.22.2 v24.14.1
```

---

## 🎨 Cores Customizadas

### Códigos de cor

| Código | Cor | Código | Cor (bold) |
|---|---|---|---|
| `r` | Vermelho | `R` | Vermelho bold |
| `g` | Verde | `G` | Verde bold |
| `b` | Azul | `B` | Azul bold |
| `c` | Ciano | `C` | Ciano bold |
| `m` | Magenta | `M` | Magenta bold |
| `y` | Amarelo | `Y` | Amarelo bold |
| `k` | Preto | `K` | Preto bold |
| `e` | Cinza claro | `W` | Branco |

### Configurar cores

```bash
# Definir cores temporariamente
nvm set-colors cgYmW

# Persistir (adicionar ao ~/.zshrc)
export NVM_COLORS='cmgRY'

# Desativar cores
nvm ls --no-colors
nvm help --no-colors
TERM=dumb nvm ls
```

---

## 🧹 Limpeza / Desinstalação

### Remover versões do Node

```bash
# Remover versão específica
nvm uninstall 20.20.1

# Remover versão LTS
nvm uninstall --lts
nvm uninstall --lts=iron
```

### Desinstalar NVM completamente

```bash
# 1. Descarregar NVM da sessão
nvm deactivate
nvm unload

# 2. Remover o diretório do NVM
rm -rf "${NVM_DIR:-$HOME/.nvm}"

# 3. Remover as linhas do NVM do seu ~/.zshrc (ou ~/.bashrc)
# Remova manualmente estas linhas:
#   export NVM_DIR="$HOME/.nvm"
#   [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
#   [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# 4. Recarregar o shell
source ~/.zshrc
```

### Limpar cache

```bash
nvm cache clear
```

---

## 🔧 Troubleshooting

### `nvm: command not found` após instalação

```bash
# macOS com zsh — certifique-se que o .zshrc existe
touch ~/.zshrc

# Rode o instalador novamente
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash

# Recarregue o shell
source ~/.zshrc
```

### `nvm: command not found` após trocar de bash para zsh

Adicione manualmente ao `~/.zshrc`:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
```

### `which nvm` não retorna nada

Isso é **esperado**. NVM é uma função de shell (source), não um binário. Use:

```bash
command -v nvm
# Deve retornar: nvm
```

### `nvm is not compatible with the npm config "prefix" option`

```bash
# Verifique se há prefix no .npmrc
cat ~/.npmrc | grep prefix

# Remova a linha com prefix se houver
# Ou remova o arquivo se só tinha isso
rm ~/.npmrc

# Verifique variáveis de ambiente
echo $NPM_CONFIG_PREFIX
echo $PREFIX

# Remova se estiverem setadas
unset NPM_CONFIG_PREFIX
unset PREFIX
```

### Mismatch entre `$HOME` e nome do diretório do usuário

```bash
# Verifique se bate
echo $HOME
ls /Users/

# Se houver diferença de capitalização, corrija seguindo:
# https://support.apple.com/en-us/HT201548
```

### Node version diferente em vim/editor

```bash
# Se nvm use 22 mas :!node -v no vim mostra a versão do sistema:
sudo chmod ugo-x /usr/libexec/path_helper
```

### Erros com `set -e` no shell

O NVM pode ter problemas se `set -e` estiver ativo. Evite usar `set -e` com NVM.

### Download falha com "Cannot resume"

```bash
# Limpe o cache e tente novamente
nvm cache clear
nvm install 22
```

### Apple Silicon — versões antigas do Node

Versões do Node anteriores a v16.0 não têm binários ARM nativos. Para instalá-las:

```bash
# Instalar Rosetta
softwareupdate --install-rosetta

# Abrir shell x86_64
arch -x86_64 zsh

# Instalar a versão antiga (compilará via Rosetta)
nvm install v14.21.3 --shared-zlib

# Verificar arquitetura
node -p process.arch
# Deve retornar: x64

# Sair do shell Rosetta
exit
```

### Homebrew e NVM

> ⚠️ Instalação via Homebrew **não é suportada** oficialmente. Se tiver problemas, desinstale via `brew uninstall nvm` e instale com o script oficial.

### zsh compinit: insecure directories

Isso é um problema do Homebrew, não do NVM. Solução:

```bash
# Verificar diretórios inseguros
compaudit

# Corrigir permissões
chmod 755 /usr/local/share/zsh/site-functions
chmod 755 /usr/local/share/zsh
```

---

## 💡 Dicas Úteis / Receitas

### Ver todas as versões instaladas com tamanho em disco

```bash
du -sh ~/.nvm/versions/node/* | sort -h
```

### Script para limpar versões antigas

```bash
# Lista todas as versões exceto a ativa e a default
nvm ls --no-alias --no-colors | grep -v "^->" | grep -v "default" | grep -v "system" | tr -d ' ' | grep "^v"
```

### Usar NVM em scripts (não-interativo)

```bash
#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

nvm use 22
node app.js
```

### Usar NVM com Docker

```dockerfile
# Exemplo: usar NVM dentro de Docker
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y curl

# Instalar NVM
ENV NVM_DIR=/root/.nvm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash

# Instalar Node
RUN bash -c "source $NVM_DIR/nvm.sh && nvm install 22"

# Usar Node em cada comando
SHELL ["/bin/bash", "-c"]
RUN source $NVM_DIR/nvm.sh && node --version
```

### Trocar de versão rapidamente entre projetos

```bash
# Projeto A: ~/.../projeto-a/.nvmrc contém "20"
cd projeto-a && nvm use
# Now using node v20.20.1

# Projeto B: ~/.../projeto-b/.nvmrc contém "22"
cd projeto-b && nvm use
# Now using node v22.22.2
```

> 💡 Com o hook de [auto-switch](#-auto-switch-ao-entrar-em-diretórios), isso acontece automaticamente ao `cd`.

### Comparar versões do Node

```bash
# Ver diferença entre o que você tem e o que existe remotamente
echo "Instalado:" && nvm ls --no-alias --no-colors
echo "---"
echo "LTS mais recente:" && nvm version-remote --lts
echo "Latest:" && nvm version-remote node
```

### Aliases úteis para o shell

```bash
# Adicionar ao ~/.zshrc
alias node-lts='nvm use --lts'
alias node-latest='nvm use node'
alias node-default='nvm use default'
alias node-versions='nvm ls'
alias node-remote='nvm ls-remote --lts'
```

### IDEs — configurar caminho do Node

Para IDEs que precisam do caminho fixo do Node:

```bash
# Ativar symlink "current"
export NVM_SYMLINK_CURRENT=true

# O caminho fixo será:
echo ~/.nvm/current/bin/node

# Ou use nvm which para obter o caminho direto
nvm which current
# Ex: /Users/gab/.nvm/versions/node/v22.22.2/bin/node
```

### Community / Links úteis

- [GitHub](https://github.com/nvm-sh/nvm)
- [Releases](https://github.com/nvm-sh/nvm/releases)
- [Issues](https://github.com/nvm-sh/nvm/issues)
- [Node.js Release Schedule](https://nodejs.org/en/about/releases/)
- [zsh-nvm plugin](https://github.com/lukechilds/zsh-nvm)
- [nvm-windows (alternativa para Windows)](https://github.com/coreybutler/nvm-windows)
- [fnm (alternativa rápida em Rust)](https://github.com/Schniz/fnm)

---

## 📚 Referência Completa de Comandos CLI

```
nvm
  --help                                Show help message
  --version                             Print nvm version
  install [<version>]                   Download and install a version
    -s                                  Install from source only
    -b                                  Install from binary only
    --reinstall-packages-from=<ver>     Reinstall global packages from <ver>
    --lts / --lts=<name>                Only select from LTS versions
    --skip-default-packages             Skip default-packages file
    --latest-npm                        Upgrade npm after install
    --no-progress                       Disable download progress bar
    --alias=<name>                      Set alias after install
    --default                           Set as default after install
    --save                              Write version to .nvmrc
    --offline                           Install from cache only
  uninstall <version>                   Uninstall a version
    --lts / --lts=<name>                Uninstall LTS version
  use [<version>]                       Switch to a version
    --silent                            Suppress output
    --lts / --lts=<name>                Use LTS version
    --save                              Write version to .nvmrc
  exec [<version>] <command>            Run command with specific version
    --silent                            Suppress output
    --lts / --lts=<name>                Use LTS version
  run [<version>] [<args>]              Run node with specific version
    --silent                            Suppress output
    --lts / --lts=<name>                Use LTS version
  current                               Show currently active version
  ls [<version>]                        List installed versions
    --no-colors                         Suppress colored output
    --no-alias                          Suppress alias output
  ls-remote [<version>]                 List remote available versions
    --lts / --lts=<name>                Only show LTS versions
    --no-colors                         Suppress colored output
  version <version>                     Resolve to single local version
  version-remote <version>              Resolve to single remote version
    --lts / --lts=<name>                Only select from LTS versions
  deactivate                            Undo nvm effects on current shell
    --silent                            Suppress output
  alias [<pattern>]                     Show aliases matching pattern
    --no-colors                         Suppress colored output
  alias <name> <version>                Set alias
  unalias <name>                        Remove alias
  install-latest-npm                    Upgrade npm to latest compatible
  reinstall-packages <version>          Reinstall global packages from version
  unload                                Unload nvm from shell
  which [current | <version>]           Show path to node binary
    --silent                            Suppress output
  cache dir                             Show cache directory path
  cache clear                           Clear download cache
  set-colors [<codes>]                  Set custom output colors
```
