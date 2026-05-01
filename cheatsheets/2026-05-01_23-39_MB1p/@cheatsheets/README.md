# 📚 Cheat Sheets — Guia de Criação e Manutenção

> Referência interna para criar, padronizar e manter nossos cheat sheets atualizados.
> Todas as docs seguem o mesmo formato para consistência e facilidade de consulta.

---

## 📋 Índice

- [Docs Existentes](#-docs-existentes)
- [Processo para Criar uma Nova Doc](#-processo-para-criar-uma-nova-doc)
- [Template Padrão](#-template-padrão)
- [Convenções de Escrita](#-convenções-de-escrita)
- [Como Atualizar uma Doc Existente](#-como-atualizar-uma-doc-existente)
- [Checklist de Qualidade](#-checklist-de-qualidade)
- [Exemplos de Referência](#-exemplos-de-referência)

---

## 📦 Docs Existentes

| Arquivo | Ferramenta | Versão Base |
|---|---|---|
| [DOCKER.md](./DOCKER.md) | Docker CLI, Dockerfile, Docker Compose | Docker v29+ |
| [HOMEBREW.md](./HOMEBREW.md) | Homebrew (gerenciador de pacotes macOS) | Homebrew v5.1+ |
| [LLAMA-CPP.md](./LLAMA-CPP.md) | llama.cpp (inferência local de LLMs) | llama.cpp v8680+ |
| [NODE.md](./NODE.md) | Node.js CLI, NPM, Yarn, pnpm, npx, Corepack, package.json | Node v24+ / NPM v11+ / Yarn v4+ / pnpm v10+ |
| [NVM.md](./NVM.md) | Node Version Manager | NVM v0.40.4+ |
| [OLLAMA.md](./OLLAMA.md) | Ollama CLI e API REST | Ollama latest |

---

## 🚀 Processo para Criar uma Nova Doc

Sempre seguimos **4 passos** para garantir que a doc seja completa e atualizada:

### Passo 1: Buscar a documentação oficial via `curl`

**Sempre começar pela fonte oficial.** Isso garante informação atualizada e evita inventar coisas.

```bash
# Exemplo: buscar README do repositório oficial
curl -sL https://raw.githubusercontent.com/<org>/<repo>/master/README.md | head -1000

# Para docs grandes, buscar em partes
curl -sL <url> | sed -n '1,500p'
curl -sL <url> | sed -n '500,1000p'

# Se a doc oficial for um site, buscar páginas específicas
curl -sL https://docs.example.com/cli-reference
```

**Fontes comuns:**
- README.md do GitHub do projeto
- Documentação oficial (docs.*.com)
- Man pages / help pages
- Changelogs e release notes

### Passo 2: Buscar o `--help` da ferramenta

O `--help` é a fonte mais precisa para a lista completa de comandos e flags:

```bash
# Executar o help da ferramenta
<ferramenta> --help
<ferramenta> -h

# Para sub-comandos
<ferramenta> <subcomando> --help

# Salvar output para referência
<ferramenta> --help > /tmp/<ferramenta>-help.txt
```

### Passo 3: Verificar versão instalada localmente

```bash
# Saber qual versão temos instalada
<ferramenta> --version
<ferramenta> -v

# Listar o que já temos configurado (se aplicável)
<ferramenta> list
<ferramenta> ls
```

### Passo 4: Criar o arquivo seguindo o template

- Criar o arquivo como `FERRAMENTA.md` (nome em **UPPERCASE**)
- Seguir a [estrutura padrão](#-template-padrão) abaixo
- Texto em **pt-BR**, código/comandos em **inglês**

---

## 📄 Template Padrão

Toda doc segue esta estrutura. Copie o esqueleto abaixo e preencha:

```markdown
# <emoji> <Nome da Ferramenta> — Cheat Sheet Completo

> Referência rápida para <descrição curta>.
> Baseado na documentação oficial: [<link>](<url>) | <Ferramenta> v<versão>+

---

## 📋 Índice

- [Tabela Geral de Comandos](#-tabela-geral-de-comandos)
- [Instalação](#-instalação)
- [<Seção Principal 1>](#)
- [<Seção Principal 2>](#)
- [<Seção Principal N>](#)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Caminhos dos Arquivos (macOS)](#-caminhos-dos-arquivos-macos)
- [Limpeza / Desinstalação](#-limpeza--desinstalação)
- [Troubleshooting](#-troubleshooting)
- [Dicas Úteis / Receitas](#-dicas-úteis--receitas)

---

## 📊 Tabela Geral de Comandos

### Comandos Principais

| Comando | O que faz |
|---|---|
| `comando1` | Descrição |
| `comando2` | Descrição |

### <Subcategoria>

| Comando | O que faz |
|---|---|
| `comando3` | Descrição |

---

## 🚀 Instalação

<!-- Como instalar a ferramenta -->

---

## <emoji> <Seção Principal 1>

<!-- Comandos detalhados com exemplos -->

### <Subseção>

```bash
# Exemplo com comentário explicativo
comando --flag valor
```

---

## 🔑 Variáveis de Ambiente

| Variável | O que faz | Padrão |
|---|---|---|
| `VAR_1` | Descrição | `valor` |

---

## 📁 Caminhos dos Arquivos (macOS)

| O que | Caminho |
|---|---|
| Config | `~/caminho/` |

---

## 🧹 Limpeza / Desinstalação

<!-- Como remover/limpar a ferramenta -->

---

## 🔧 Troubleshooting

### Problema comum 1

```bash
# Solução
comando fix
```

---

## 💡 Dicas Úteis / Receitas

### Dica 1

```bash
# Receita útil
comando combinado
```

---

## 📚 Referência Completa de Comandos CLI

```
ferramenta
  comando1          Descrição
    --flag1         Descrição da flag
    --flag2         Descrição da flag
  comando2          Descrição
```
```

### Seções obrigatórias (toda doc deve ter)

| Seção | Emoji | Propósito |
|---|---|---|
| Tabela Geral de Comandos | 📊 | Visão rápida de TODOS os comandos |
| Instalação | 🚀 | Como instalar/atualizar |
| Variáveis de Ambiente | 🔑 | Configuração via env vars |
| Caminhos dos Arquivos (macOS) | 📁 | Onde ficam configs, dados, logs |
| Limpeza / Desinstalação | 🧹 | Como remover completamente |
| Troubleshooting | 🔧 | Problemas comuns e soluções |
| Dicas Úteis / Receitas | 💡 | Combinações úteis, one-liners |
| Referência Completa CLI | 📚 | Todos os comandos com flags (texto puro) |

### Seções opcionais (quando aplicável)

| Seção | Quando usar |
|---|---|
| API REST | Ferramentas com API HTTP (ex: Ollama) |
| Docker | Ferramentas que rodam em Docker |
| Autenticação | Ferramentas com login/auth |
| Plugins / Extensões | Ferramentas extensíveis |

---

## ✍️ Convenções de Escrita

### Idioma

| Onde | Idioma |
|---|---|
| Texto explicativo, títulos, descrições | **Português (pt-BR)** |
| Comandos, código, variáveis, paths | **Inglês** |
| Comentários dentro de blocos de código | **Português (pt-BR)** |

### Formatação

#### Header principal

```markdown
# <emoji> <Nome> — Cheat Sheet Completo
```

Sempre com:
- Um emoji representativo no início
- Nome da ferramenta
- "— Cheat Sheet Completo"

#### Blockquote de referência

```markdown
> Referência rápida para <descrição>.
> Baseado na documentação oficial: [<link>](<url>) | <Ferramenta> v<versão>+
```

#### Tabelas de comandos

```markdown
| Comando | O que faz |
|---|---|
| `comando` | Descrição curta em pt-BR |
```

- Coluna "Comando" sempre com backticks
- Coluna "O que faz" em pt-BR, direto ao ponto
- Para flags com exemplo: adicionar coluna "Exemplo"

```markdown
| Flag | O que faz | Exemplo |
|---|---|---|
| `-d` | Detached (background) | `docker run -d nginx` |
```

#### Blocos de código

```markdown
```bash
# Comentário explicativo em pt-BR
comando --flag valor

# Outro exemplo
comando2 --outra-flag
```​
```

- Sempre usar `bash` como linguagem (exceto Dockerfile, yaml, etc.)
- Comentários com `#` antes de cada comando ou grupo
- Uma linha em branco entre grupos de comandos relacionados

#### Emojis de seção

Usar consistentemente:

| Emoji | Uso |
|---|---|
| 📊 | Tabela geral |
| 📋 | Índice |
| 📦 | Gerenciamento / Pacotes |
| 🚀 | Instalação / Início |
| 🔍 | Inspeção / Debug |
| 🏗️ | Build / Construção |
| 💬 | Interação / Chat |
| 🔄 | Trocar / Alternar |
| 🏷️ | Aliases / Tags |
| 🔒 | Segurança / Auth |
| 🌐 | Network / API |
| 💾 | Volumes / Storage |
| 🔑 | Variáveis / Config |
| 📁 | Caminhos / Arquivos |
| ⌨️ | Completion / Input |
| 🎨 | Customização |
| 🧹 | Limpeza |
| 🔧 | Troubleshooting |
| 💡 | Dicas |
| 📚 | Referência |
| ℹ️ | Info / Sistema |
| 🐙 | Docker Compose (específico) |
| 🦙 | Ollama (específico) |
| 📄 | Arquivos de config |

#### Callouts / Destaques

```markdown
> ⚠️ **Atenção:** Informação importante que pode causar problemas se ignorada.

> 💡 **Dica:** Sugestão útil que melhora a experiência.

> **Importante:** Nota relevante sobre comportamento.
```

### Nomenclatura de Arquivos

- Nome do arquivo: `FERRAMENTA.md` (sempre **UPPERCASE**)
- Exemplos: `DOCKER.md`, `OLLAMA.md`, `NVM.md`, `GIT.md`, `TMUX.md`
- Sem prefixos ou sufixos extras

### Separadores

Usar `---` entre cada seção principal (## h2).

---

## 🔄 Como Atualizar uma Doc Existente

### Quando atualizar

- Quando a ferramenta lança uma **nova versão major**
- Quando **novos comandos ou flags** são adicionados
- Quando **comportamentos mudam** (breaking changes)
- Quando encontramos **erros** na doc existente

### Processo de atualização

```bash
# 1. Verificar versão atual da ferramenta
<ferramenta> --version

# 2. Buscar doc oficial atualizada
curl -sL <url-da-doc-oficial> | head -1000

# 3. Buscar help atualizado
<ferramenta> --help

# 4. Comparar com nossa doc e identificar diferenças

# 5. Atualizar:
#    - Versão no header (blockquote)
#    - Novos comandos/flags nas tabelas
#    - Novos exemplos
#    - Seções novas se necessário
#    - Remover informações deprecated
```

### O que NÃO fazer ao atualizar

- ❌ Não remover seções existentes sem motivo
- ❌ Não mudar a estrutura/ordem das seções
- ❌ Não trocar o idioma (manter pt-BR para texto, inglês para código)
- ❌ Não remover exemplos que ainda funcionam

---

## ✅ Checklist de Qualidade

Antes de considerar uma doc pronta, verifique:

### Pesquisa

- [ ] Buscou a documentação oficial via `curl`?
- [ ] Buscou o `--help` / `-h` da ferramenta?
- [ ] Verificou a versão instalada localmente?
- [ ] Conferiu se há features novas no changelog/release notes?

### Estrutura

- [ ] Segue o template padrão?
- [ ] Tem todas as seções obrigatórias?
- [ ] O índice tem links âncora corretos?
- [ ] Tem separadores `---` entre seções?

### Conteúdo

- [ ] A Tabela Geral cobre TODOS os comandos da ferramenta?
- [ ] Cada comando tem pelo menos um exemplo de uso?
- [ ] Flags/opções importantes estão documentadas?
- [ ] Inclui variáveis de ambiente relevantes?
- [ ] Caminhos de arquivos estão corretos para macOS?
- [ ] Troubleshooting cobre problemas comuns?
- [ ] Dicas úteis incluem receitas práticas do dia-a-dia?

### Formato

- [ ] Header com emoji + "— Cheat Sheet Completo"?
- [ ] Blockquote com link para doc oficial + versão?
- [ ] Texto em pt-BR, código em inglês?
- [ ] Comentários nos blocos de código em pt-BR?
- [ ] Tabelas formatadas corretamente?
- [ ] Emojis consistentes nas seções?
- [ ] Callouts (⚠️, 💡) usados onde necessário?

### Verificação Final

- [ ] Leu a doc inteira do início ao fim?
- [ ] Testou os comandos mais importantes?
- [ ] A referência CLI no final bate com o `--help`?

---

## 📖 Exemplos de Referência

### Docs que seguem bem o padrão

| Doc | Destaque |
|---|---|
| [DOCKER.md](./DOCKER.md) | Mais completa — excelente referência de tabelas extensas, Dockerfile reference, docker-compose.yml reference |
| [OLLAMA.md](./OLLAMA.md) | Boa referência para ferramentas com API REST, seção de Launch/Integrações, Modelfile |
| [NVM.md](./NVM.md) | Boa referência para ferramentas de versionamento, auto-switch hooks, migração de pacotes |

### Padrões extraídos das docs existentes

**Abertura consistente:**
```markdown
# 🐳 Docker — Cheat Sheet Completo
# 🦙 Ollama CLI — Cheat Sheet Completo
# 📦 NVM (Node Version Manager) — Cheat Sheet Completo
```

**Blockquote consistente:**
```markdown
> Referência rápida para Docker CLI, Dockerfile, Docker Compose e boas práticas.
> Baseado na documentação oficial: [docs.docker.com](https://docs.docker.com) | Docker v29+
```

**Primeira seção sempre é a Tabela Geral — permite consulta rápida sem ler a doc inteira.**

**Última seção sempre é a Referência Completa CLI — dump de todos os comandos com flags em texto puro.**

---

## 🎯 Ideias para Novas Docs

Sugestões de ferramentas que usamos e poderiam ter cheat sheets:

| Ferramenta | Prioridade | Notas |
|---|---|---|
| Git | Alta | Comandos, workflows, aliases |
| Homebrew | Alta | Gerenciador de pacotes macOS |
| npm / pnpm | Média | Gerenciamento de pacotes Node |
| tmux | Média | Terminal multiplexer |
| SSH | Média | Config, keys, tunnels |
| Vim / Neovim | Baixa | Keybindings, config |
| curl | Baixa | Flags, exemplos de API |
| jq | Baixa | Processamento de JSON |

---

> 💡 **Lembre-se:** A meta é que qualquer pessoa consiga consultar rapidamente **qualquer comando** de uma ferramenta sem precisar sair do editor ou abrir o Google. Mantenha as docs práticas, diretas e sempre atualizadas.
