# 🦙 Ollama CLI — Cheat Sheet Completo

> Referência rápida para uso do Ollama via linha de comando e API.
> Baseado na documentação oficial: [github.com/ollama/ollama](https://github.com/ollama/ollama) | [docs.ollama.com](https://docs.ollama.com)

---

## 📊 Tabela Geral de Comandos

### Comandos Principais

| Comando | O que faz |
|---|---|
| `ollama run MODEL [PROMPT]` | Executa modelo / inicia chat interativo |
| `ollama run MODEL "pergunta"` | Faz pergunta única sem abrir chat |
| `ollama serve` | Inicia o servidor manualmente (porta 11434) |
| `ollama --version` / `-v` | Mostra versão instalada |
| `ollama --help` / `-h` | Mostra ajuda |

### Gerenciamento de Modelos

| Comando | O que faz |
|---|---|
| `ollama list` / `ollama ls` | Lista modelos baixados localmente |
| `ollama pull MODEL` | Baixa ou atualiza um modelo |
| `ollama pull MODEL:TAG` | Baixa versão específica (ex: `gemma3:27b`) |
| `ollama push MODEL` | Envia modelo para o registro ollama.com |
| `ollama rm MODEL [MODEL...]` | Remove modelo(s) do disco |
| `ollama show MODEL` | Mostra detalhes do modelo |
| `ollama show MODEL --modelfile` | Mostra o Modelfile |
| `ollama show MODEL --license` | Mostra licença |
| `ollama show MODEL --parameters` | Mostra parâmetros |
| `ollama show MODEL --system` | Mostra system prompt |
| `ollama show MODEL --template` | Mostra template de prompt |
| `ollama show MODEL --verbose` | Mostra info detalhada |
| `ollama cp SOURCE DEST` | Copia/clona modelo com outro nome |
| `ollama create MODEL -f Modelfile` | Cria modelo customizado |
| `ollama create MODEL --quantize q4_0` | Cria com quantização |

### Modelos em Execução

| Comando | O que faz |
|---|---|
| `ollama ps` | Lista modelos carregados em memória |
| `ollama stop MODEL` | Descarrega modelo da memória |

### Integrações (Launch)

| Comando | O que faz |
|---|---|
| `ollama launch` | Inicia integração interativamente |
| `ollama launch claude` | Inicia Claude Code |
| `ollama launch codex` | Inicia Codex |
| `ollama launch openclaw` | Inicia OpenClaw |
| `ollama launch droid` | Inicia Droid |
| `ollama launch INTEGRATION --model MODEL` | Inicia com modelo específico |
| `ollama launch INTEGRATION --config` | Apenas configura (sem iniciar) |

### Autenticação

| Comando | O que faz |
|---|---|
| `ollama signin` / `ollama login` | Faz login no ollama.com |
| `ollama signout` / `ollama logout` | Faz logout do ollama.com |

### Flags do `run`

| Flag | O que faz |
|---|---|
| `--verbose` | Mostra métricas de performance (tokens/s) |
| `--format json` | Força resposta em JSON |
| `--keepalive 30m` | Define tempo que modelo fica na memória |
| `--nowordwrap` | Desativa quebra automática de linha |
| `--think` | Ativa modo pensamento (thinking models) |
| `--hidethinking` | Esconde processo de pensamento |
| `--experimental-websearch` | Habilita busca web |
| `--experimental-yolo` | Modo YOLO |

### Comandos do Chat Interativo (`ollama run`)

| Comando | O que faz |
|---|---|
| `/bye` | Sai do chat |
| `/set system "instruções"` | Define system prompt |
| `/show info` | Mostra info do modelo |
| `/show modelfile` | Mostra Modelfile |
| `/show license` | Mostra licença |
| `/show template` | Mostra template |
| `/show parameters` | Mostra parâmetros |
| `/show system` | Mostra system prompt |
| `/clear` | Limpa contexto da conversa |
| `/load MODEL` | Troca de modelo |
| `/save NOME` | Salva a conversa |
| `"""` | Inicia/termina bloco multilinha |
| `Ctrl+G` | Abre editor externo |

### API REST

| Endpoint | Método | O que faz |
|---|---|---|
| `/api/generate` | POST | Gera texto (completion) |
| `/api/chat` | POST | Chat com histórico |
| `/api/create` | POST | Cria modelo |
| `/api/tags` | GET | Lista modelos instalados |
| `/api/show` | POST | Info de um modelo |
| `/api/copy` | POST | Copia modelo |
| `/api/delete` | DELETE | Remove modelo |
| `/api/pull` | POST | Baixa modelo |
| `/api/push` | POST | Envia modelo |
| `/api/embed` | POST | Gera embeddings |
| `/api/ps` | GET | Modelos em memória |
| `/api/version` | GET | Versão do Ollama |

### Verificar/Encerrar (sem iniciar o serviço)

| Comando | O que faz |
|---|---|
| `pgrep -fl ollama` | Verifica se está rodando |
| `lsof -i :11434` | Verifica se a porta está em uso |
| `pkill ollama` | Encerra o processo |
| `pkill -9 ollama` | Força encerramento |

---

## 📋 Índice

- [Serviço / Servidor](#-serviço--servidor)
- [Gerenciamento de Modelos](#-gerenciamento-de-modelos)
- [Descobrir Modelos Disponíveis](#-descobrir-modelos-disponíveis)
- [Executar / Conversar](#-executar--conversar)
- [Comandos do Chat Interativo](#-comandos-do-chat-interativo)
- [Modelos em Execução (Memória)](#-modelos-em-execução-memória)
- [Launch — Integrações com Ferramentas](#-launch--integrações-com-ferramentas)
- [Autenticação](#-autenticação)
- [Criar Modelos Customizados (Modelfile)](#-criar-modelos-customizados-modelfile)
- [Importar Modelos (GGUF / Safetensors)](#-importar-modelos-gguf--safetensors)
- [API REST (HTTP)](#-api-rest-http)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Caminhos dos Arquivos (macOS)](#-caminhos-dos-arquivos-macos)
- [Verificar / Encerrar sem Iniciar o Serviço](#-verificar--encerrar-sem-iniciar-o-serviço)
- [Limpeza Total](#-limpeza-total)
- [Dicas Úteis](#-dicas-úteis)

---

## 🚀 Serviço / Servidor

| Comando | O que faz |
|---|---|
| `ollama serve` | Inicia o servidor manualmente (porta 11434) |
| `ollama serve --help` | Lista variáveis de ambiente configuráveis |
| `ollama --version` ou `ollama -v` | Mostra a versão instalada |

> ⚠️ **Atenção:** Qualquer comando `ollama` (ex: `ollama list`, `ollama ps`) vai **iniciar o serviço automaticamente** se ele não estiver rodando. Para verificar sem iniciar, veja a seção [Verificar sem Iniciar](#-verificar--encerrar-sem-iniciar-o-serviço).

---

## 📦 Gerenciamento de Modelos

| Comando | O que faz |
|---|---|
| `ollama list` ou `ollama ls` | Lista todos os modelos baixados localmente |
| `ollama pull <modelo>` | Baixa ou atualiza um modelo |
| `ollama pull <modelo>:<tag>` | Baixa versão específica (ex: `gemma3:27b`) |
| `ollama push <modelo>` | Envia modelo para o registro do ollama.com |
| `ollama push <modelo> --insecure` | Push permitindo conexão insegura |
| `ollama rm <modelo>` | Remove um modelo do disco |
| `ollama rm <modelo1> <modelo2>` | Remove múltiplos modelos de uma vez |
| `ollama show <modelo>` | Mostra detalhes do modelo |
| `ollama show <modelo> --modelfile` | Mostra o Modelfile do modelo |
| `ollama show <modelo> --license` | Mostra a licença do modelo |
| `ollama show <modelo> --parameters` | Mostra os parâmetros do modelo |
| `ollama show <modelo> --system` | Mostra o system prompt do modelo |
| `ollama show <modelo> --template` | Mostra o template de prompt do modelo |
| `ollama show <modelo> --verbose` | Mostra informações detalhadas |
| `ollama cp <origem> <destino>` | Copia/clona um modelo com outro nome |

### Exemplos de modelos populares

```bash
# Meta Llama
ollama pull llama3.2           # Llama 3.2 (padrão)
ollama pull llama3.3           # Llama 3.3

# Google Gemma
ollama pull gemma3             # Gemma 3 (modelo padrão nos docs oficiais)
ollama pull gemma3:27b         # Gemma 3 (27B)

# Mistral
ollama pull mistral            # Mistral 7B
ollama pull mistral-small      # Mistral Small
ollama pull mistral-nemo       # Mistral Nemo

# Código
ollama pull codellama          # Code Llama
ollama pull deepseek-coder-v2  # DeepSeek Coder V2

# Pensamento / Raciocínio
ollama pull deepseek-r1        # DeepSeek R1 (thinking model)
ollama pull qwen3              # Qwen 3

# Microsoft
ollama pull phi4               # Phi-4

# Alibaba
ollama pull qwen2.5            # Qwen 2.5
ollama pull qwen3.5            # Qwen 3.5

# Multimodal (imagem + texto)
ollama pull gemma3             # Gemma 3 (suporta imagens)
ollama pull llava              # LLaVA

# Embeddings
ollama pull nomic-embed-text   # Nomic Embed Text
```

---

## 🔍 Descobrir Modelos Disponíveis

O Ollama **não tem comando CLI** para listar modelos disponíveis para download. As formas de descobrir modelos são:

### 1. Site oficial (melhor opção)

🔗 **[https://ollama.com/library](https://ollama.com/library)**

Lá você pode filtrar por categoria, tamanho, popularidade, etc.

### 2. Pesquisar no site via CLI

```bash
# Abrir a library direto no navegador (macOS)
open https://ollama.com/library

# Buscar um modelo específico
open "https://ollama.com/search?q=codellama"

# Filtrar por capacidade (ex: tool calling)
open "https://ollama.com/search?c=tool"
```

### 3. Tentar baixar diretamente

Se você já sabe o nome, basta tentar:

```bash
ollama pull nome-do-modelo
```

Se o modelo existir, será baixado. Se não, retorna erro.

### 4. Modelos com tags (variantes)

Muitos modelos têm variantes por tamanho. Exemplos:

```bash
ollama pull llama3.2           # padrão (geralmente o menor)
ollama pull llama3.2:1b        # 1 bilhão de parâmetros
ollama pull llama3.2:3b        # 3 bilhões de parâmetros
```

### Formato de nomes

Os nomes seguem o formato `modelo:tag`, podendo ter namespace:
- `gemma3` → tag `latest` implícita
- `gemma3:27b` → tag específica de tamanho
- `usuario/meu-modelo:v1` → modelo com namespace

---

## 💬 Executar / Conversar

| Comando | O que faz |
|---|---|
| `ollama run <modelo>` | Inicia chat interativo com o modelo |
| `ollama run <modelo> "pergunta"` | Faz uma pergunta única (sem abrir chat) |
| `ollama run <modelo> --verbose` | Chat com métricas de performance (tokens/s) |
| `ollama run <modelo> --format json` | Força resposta em formato JSON |
| `ollama run <modelo> --keepalive 30m` | Define tempo que o modelo fica na memória |
| `ollama run <modelo> --nowordwrap` | Desativa quebra automática de linha |
| `ollama run <modelo> --think` | Ativa modo de pensamento (thinking models) |
| `ollama run <modelo> --hidethinking` | Esconde o processo de pensamento |
| `echo "pergunta" \| ollama run <modelo>` | Envia via pipe |
| `cat arquivo.txt \| ollama run <modelo> "resuma"` | Envia arquivo como contexto |

### Flags experimentais do `run`

| Flag | O que faz |
|---|---|
| `--experimental-websearch` | Habilita busca web durante o chat |
| `--experimental-yolo` | Modo YOLO (menos restrições) |

### Exemplos

```bash
# Chat interativo
ollama run gemma3

# Pergunta direta
ollama run gemma3 "Explique o que é Docker em 3 frases"

# Com métricas de performance
ollama run gemma3 --verbose "Olá mundo"

# Forçar JSON
ollama run gemma3 --format json "Liste 3 frutas com nome e cor"

# Thinking model
ollama run deepseek-r1 --think "Resolva: 25 * 48 + 312"

# Enviar arquivo como contexto
cat main.py | ollama run codellama "Revise este código e sugira melhorias"

# Pipe com outro comando
echo "SELECT * FROM users WHERE active = 1" | ollama run codellama "Otimize esta query SQL"
```

### Modelos multimodais (imagens)

```bash
# Enviar imagem junto com a pergunta
ollama run gemma3 "What's in this image? /Users/user/Desktop/foto.png"
```

### Gerar embeddings via CLI

```bash
# Gerar embedding
ollama run nomic-embed-text "Hello world"

# Via pipe
echo "Hello world" | ollama run nomic-embed-text
```

---

## ⌨️ Comandos do Chat Interativo

Dentro de uma sessão `ollama run`:

| Comando | O que faz |
|---|---|
| `/bye` | Sai do chat |
| `/set system "instruções"` | Define o system prompt |
| `/show info` | Mostra info do modelo atual |
| `/show modelfile` | Mostra o Modelfile |
| `/show license` | Mostra licença do modelo |
| `/show template` | Mostra template de prompt |
| `/show parameters` | Mostra parâmetros do modelo |
| `/show system` | Mostra system prompt |
| `/clear` | Limpa contexto da conversa |
| `/load <modelo>` | Troca de modelo |
| `/save <nome>` | Salva a conversa |
| `"""` | Inicia/termina bloco de texto multilinha |
| `Ctrl+G` | Abre editor externo (configurável via `OLLAMA_EDITOR`) |

---

## 🔧 Modelos em Execução (Memória)

| Comando | O que faz |
|---|---|
| `ollama ps` | Lista modelos carregados em memória (VRAM/RAM) |
| `ollama stop <modelo>` | Descarrega modelo da memória |

A saída de `ollama ps` mostra:

```
NAME              ID            SIZE    PROCESSOR    UNTIL
gemma3:latest     abc123def     4.7 GB  100% GPU     4 minutes from now
```

- **SIZE** → Quanto está consumindo de memória
- **PROCESSOR** → Se está usando GPU, CPU ou misto
- **UNTIL** → Quando será descarregado automaticamente (padrão: 5 min de inatividade)

---

## 🚀 Launch — Integrações com Ferramentas

O comando `ollama launch` configura e inicia aplicações externas para usar modelos do Ollama.

### Integrações suportadas

| Integração | Descrição |
|---|---|
| **OpenCode** | Assistente de código open-source |
| **Claude Code** | Ferramenta de código agêntica da Anthropic |
| **Codex** | Assistente de código da OpenAI |
| **VS Code** | IDE da Microsoft com chat AI integrado |
| **Droid** | Agente de código AI da Factory |
| **OpenClaw** | Assistente AI pessoal (WhatsApp, Telegram, Slack, Discord) |

### Comandos

```bash
# Iniciar interativamente (escolhe a integração)
ollama launch

# Iniciar integração específica
ollama launch claude
ollama launch codex
ollama launch openclaw

# Iniciar com modelo específico
ollama launch claude --model qwen3.5

# Apenas configurar (sem iniciar)
ollama launch droid --config
```

---

## 🔐 Autenticação

| Comando | O que faz |
|---|---|
| `ollama signin` | Faz login no ollama.com |
| `ollama login` | Alias para `signin` |
| `ollama signout` | Faz logout do ollama.com |
| `ollama logout` | Alias para `signout` |

Necessário para `ollama push` (enviar modelos ao registro).

---

## 🏗️ Criar Modelos Customizados (Modelfile)

Um `Modelfile` é o blueprint para criar e compartilhar modelos customizados.

### Formato

```dockerfile
# comentário
INSTRUÇÃO argumentos
```

> O Modelfile **não diferencia maiúsculas de minúsculas**. As instruções podem estar em qualquer ordem.

### Instruções disponíveis

| Instrução | Descrição |
|---|---|
| `FROM` (obrigatório) | Define o modelo base |
| `PARAMETER` | Configura parâmetros de execução |
| `TEMPLATE` | Template de prompt completo (Go template syntax) |
| `SYSTEM` | Define o system prompt |
| `ADAPTER` | Aplica adaptadores (Q)LoRA ao modelo |
| `LICENSE` | Especifica texto de licença |
| `MESSAGE` | Pre-seed de histórico de conversa |
| `REQUIRES` | Versão mínima do Ollama necessária |

### Exemplo completo

```dockerfile
FROM gemma3

# System prompt personalizado
SYSTEM """Você é um assistente especializado em Python. Sempre responda em português."""

# Parâmetros de geração
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER num_ctx 4096
PARAMETER repeat_penalty 1.1
PARAMETER stop "<|end|>"
PARAMETER stop "<|eot_id|>"

# Versão mínima do Ollama
REQUIRES 0.14.0
```

### Comandos para modelos customizados

```bash
# Criar o modelo
ollama create meu-modelo -f ./Modelfile

# Criar com quantização
ollama create meu-modelo -f ./Modelfile --quantize q4_0

# Rodar
ollama run meu-modelo

# Listar (vai aparecer junto com os outros)
ollama list

# Ver o Modelfile de qualquer modelo
ollama show --modelfile gemma3

# Remover
ollama rm meu-modelo
```

### Parâmetros válidos (PARAMETER)

| Parâmetro | Descrição | Tipo | Padrão |
|---|---|---|---|
| `num_ctx` | Tamanho da janela de contexto (tokens) | int | 2048 |
| `temperature` | Criatividade (0 = determinístico, maior = mais criativo) | float | 0.8 |
| `top_p` | Nucleus sampling (0-1) | float | 0.9 |
| `top_k` | Top-K sampling (menor = mais conservador) | int | 40 |
| `min_p` | Probabilidade mínima relativa ao token mais provável | float | 0.0 |
| `repeat_penalty` | Penalidade por repetição (>1 = mais penalidade) | float | 1.1 |
| `repeat_last_n` | Quantos tokens olhar para trás para evitar repetição (0=desativado, -1=num_ctx) | int | 64 |
| `seed` | Seed para reprodutibilidade (0 = aleatório) | int | 0 |
| `stop` | Tokens de parada (pode ter múltiplos) | string | — |
| `num_predict` | Máximo de tokens gerados (-1 = ilimitado) | int | -1 |

### TEMPLATE — Template de prompt customizado

Usa sintaxe de [Go template](https://pkg.go.dev/text/template):

| Variável | Descrição |
|---|---|
| `{{ .System }}` | Mensagem de sistema |
| `{{ .Prompt }}` | Mensagem do usuário |
| `{{ .Response }}` | Resposta do modelo |

```dockerfile
TEMPLATE """{{ if .System }}<|im_start|>system
{{ .System }}<|im_end|>
{{ end }}{{ if .Prompt }}<|im_start|>user
{{ .Prompt }}<|im_end|>
{{ end }}<|im_start|>assistant
"""
```

### ADAPTER — LoRA adapters

```dockerfile
# Safetensor adapter
ADAPTER /caminho/para/adapter/safetensor

# GGUF adapter
ADAPTER ./meu-lora.gguf
```

Arquiteturas suportadas para Safetensor adapters: Llama, Mistral, Gemma.

### MESSAGE — Pre-seed de conversas

```dockerfile
MESSAGE user Toronto fica no Canadá?
MESSAGE assistant Sim
MESSAGE user Sacramento fica no Canadá?
MESSAGE assistant Não
MESSAGE user Ontario fica no Canadá?
MESSAGE assistant Sim
```

Roles válidos: `system`, `user`, `assistant`.

---

## 📥 Importar Modelos (GGUF / Safetensors)

### Importar de arquivo GGUF

```dockerfile
# Modelfile
FROM ./meu-modelo.gguf
```

```bash
ollama create meu-modelo -f Modelfile
```

### Importar de diretório Safetensors

```dockerfile
# Modelfile
FROM /caminho/para/diretorio/safetensors
```

```bash
ollama create meu-modelo -f Modelfile
```

Arquiteturas suportadas: Llama (1/2/3/3.1/3.2), Mistral (1/2, Mixtral), Gemma (1/2), Phi3.

### Quantização ao importar

```bash
ollama create meu-modelo -f Modelfile --quantize q4_0
```

Tipos de quantização disponíveis: `q4_0`, `q4_1`, `q5_0`, `q5_1`, `q8_0`, `f16`, `f32`.

---

## 🌐 API REST (HTTP)

O Ollama expõe uma API em `http://localhost:11434`. Docs oficiais: [docs.ollama.com/api](https://docs.ollama.com/api)

### Endpoints

| Endpoint | Método | O que faz |
|---|---|---|
| `/api/generate` | POST | Gera texto (completion) |
| `/api/chat` | POST | Chat com histórico de mensagens |
| `/api/create` | POST | Cria modelo a partir de Modelfile |
| `/api/tags` | GET | Lista modelos instalados |
| `/api/show` | POST | Info de um modelo |
| `/api/copy` | POST | Copia/clona um modelo |
| `/api/delete` | DELETE | Remove um modelo |
| `/api/pull` | POST | Baixa um modelo |
| `/api/push` | POST | Envia modelo para registro |
| `/api/embed` | POST | Gera embeddings |
| `/api/ps` | GET | Modelos em memória |
| `/api/version` | GET | Versão do Ollama |
| `/api/blobs/:digest` | HEAD | Verifica se um blob existe |

### Parâmetros do `/api/generate`

- `model` (obrigatório): nome do modelo
- `prompt`: o prompt
- `suffix`: texto após a resposta (para code infill)
- `images`: lista de imagens em base64 (modelos multimodais)
- `think`: ativa pensamento (thinking models)
- `format`: `json` ou JSON schema (structured outputs)
- `options`: parâmetros do modelo (temperature, top_p, etc.)
- `system`: system prompt (sobrescreve Modelfile)
- `template`: template de prompt (sobrescreve Modelfile)
- `stream`: `false` para resposta única (padrão: `true`)
- `raw`: `true` para enviar prompt sem formatação
- `keep_alive`: tempo na memória após request (padrão: `5m`)
- `width`, `height`, `steps`: (experimental) parâmetros de geração de imagem

### Parâmetros do `/api/chat`

- `model` (obrigatório): nome do modelo
- `messages`: array de mensagens (`role`, `content`, `images`, `tool_calls`, `thinking`)
- `tools`: lista de ferramentas JSON (tool calling)
- `think`: ativa pensamento
- `format`: `json` ou JSON schema
- `options`: parâmetros do modelo
- `stream`: `false` para resposta única
- `keep_alive`: tempo na memória

Roles de mensagem: `system`, `user`, `assistant`, `tool`.

### Exemplos com curl

```bash
# Geração simples (sem streaming)
curl http://localhost:11434/api/generate -d '{
  "model": "gemma3",
  "prompt": "O que é Docker?",
  "stream": false
}'

# Chat com histórico
curl http://localhost:11434/api/chat -d '{
  "model": "gemma3",
  "messages": [
    {"role": "system", "content": "Responda sempre em português"},
    {"role": "user", "content": "O que é Kubernetes?"}
  ],
  "stream": false
}'

# Chat com thinking model
curl http://localhost:11434/api/chat -d '{
  "model": "deepseek-r1",
  "messages": [
    {"role": "user", "content": "Quanto é 25 * 48 + 312?"}
  ],
  "think": true,
  "stream": false
}'

# Structured outputs (JSON schema)
curl http://localhost:11434/api/chat -d '{
  "model": "gemma3",
  "messages": [{"role": "user", "content": "Liste 3 frutas"}],
  "format": {
    "type": "object",
    "properties": {
      "frutas": {
        "type": "array",
        "items": {"type": "string"}
      }
    }
  },
  "stream": false
}'

# Listar modelos instalados
curl -s http://localhost:11434/api/tags | jq

# Info de um modelo
curl http://localhost:11434/api/show -d '{"name": "gemma3"}'

# Gerar embeddings
curl http://localhost:11434/api/embed -d '{
  "model": "nomic-embed-text",
  "input": "texto para gerar embedding"
}'

# Copiar modelo
curl http://localhost:11434/api/copy -d '{
  "source": "gemma3",
  "destination": "gemma3-backup"
}'

# Baixar modelo via API
curl http://localhost:11434/api/pull -d '{
  "name": "mistral",
  "stream": false
}'

# Deletar modelo via API
curl -X DELETE http://localhost:11434/api/delete -d '{"name": "mistral"}'

# Push modelo para registro
curl http://localhost:11434/api/push -d '{
  "model": "meu-usuario/meu-modelo:latest",
  "stream": false
}'

# Ver modelos em memória
curl -s http://localhost:11434/api/ps | jq

# Ver versão
curl -s http://localhost:11434/api/version
```

### Geração com parâmetros customizados

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "gemma3",
  "prompt": "Escreva um haiku sobre programação",
  "stream": false,
  "options": {
    "temperature": 0.9,
    "top_p": 0.95,
    "num_ctx": 4096,
    "seed": 42
  }
}'
```

### Code completion com suffix (infill)

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "codellama:code",
  "prompt": "def compute_gcd(a, b):",
  "suffix": "    return result",
  "options": {"temperature": 0},
  "stream": false
}'
```

### Carregar/descarregar modelo via API

```bash
# Carregar modelo na memória (sem gerar)
curl http://localhost:11434/api/generate -d '{"model": "gemma3"}'

# Descarregar modelo da memória
curl http://localhost:11434/api/generate -d '{"model": "gemma3", "keep_alive": 0}'
```

### Métricas de resposta

As respostas incluem métricas úteis:

- `total_duration`: tempo total (nanosegundos)
- `load_duration`: tempo carregando modelo (ns)
- `prompt_eval_count`: tokens no prompt
- `prompt_eval_duration`: tempo avaliando prompt (ns)
- `eval_count`: tokens na resposta
- `eval_duration`: tempo gerando resposta (ns)

**Calcular tokens/segundo:** `eval_count / eval_duration * 10^9`

---

## 🔑 Variáveis de Ambiente

Todas configuráveis via `export` no shell ou passando antes do comando.

### Principais

| Variável | O que faz | Padrão |
|---|---|---|
| `OLLAMA_HOST` | IP/porta do servidor | `127.0.0.1:11434` |
| `OLLAMA_MODELS` | Diretório onde ficam os modelos | `~/.ollama/models` |
| `OLLAMA_KEEP_ALIVE` | Tempo que modelo fica em memória após uso | `5m` |
| `OLLAMA_LOAD_TIMEOUT` | Timeout para carregamento de modelo | `5m` |
| `OLLAMA_NUM_PARALLEL` | Número máximo de requisições paralelas | `1` |
| `OLLAMA_MAX_LOADED_MODELS` | Máx modelos carregados em memória por GPU | `0` (auto) |
| `OLLAMA_MAX_QUEUE` | Máx requisições na fila | `512` |
| `OLLAMA_ORIGINS` | Origens CORS permitidas (separadas por vírgula) | — |
| `OLLAMA_CONTEXT_LENGTH` | Tamanho padrão de contexto (se não especificado) | Auto (baseado em VRAM) |

### Performance / GPU

| Variável | O que faz | Padrão |
|---|---|---|
| `OLLAMA_GPU_OVERHEAD` | Reserva de VRAM por GPU (bytes) | `0` |
| `OLLAMA_FLASH_ATTENTION` | Ativa flash attention | `false` |
| `OLLAMA_KV_CACHE_TYPE` | Tipo de quantização do cache K/V | `f16` |
| `OLLAMA_SCHED_SPREAD` | Sempre distribuir modelo em todas as GPUs | `false` |
| `OLLAMA_LLM_LIBRARY` | Forçar biblioteca LLM específica | Auto |
| `OLLAMA_VULKAN` | Ativar suporte Vulkan (experimental) | `false` |
| `OLLAMA_NEW_ENGINE` | Ativar nova engine do Ollama | `false` |

### Debug / Logging

| Variável | O que faz | Padrão |
|---|---|---|
| `OLLAMA_DEBUG` | Mostra informações adicionais de debug | `false` |
| `OLLAMA_DEBUG_LOG_REQUESTS` | Loga requests de inferência e gera curl de replay | `false` |

### Comportamento

| Variável | O que faz | Padrão |
|---|---|---|
| `OLLAMA_NOHISTORY` | Não preserva histórico do readline | `false` |
| `OLLAMA_NOPRUNE` | Não limpa blobs de modelo no startup | `false` |
| `OLLAMA_MULTIUSER_CACHE` | Otimiza cache de prompt para cenários multi-usuário | `false` |
| `OLLAMA_NO_CLOUD` | Desativa funcionalidades cloud (inferência remota e web search) | `false` |
| `OLLAMA_REMOTES` | Hosts permitidos para modelos remotos | `ollama.com` |
| `OLLAMA_EDITOR` | Caminho para editor externo (Ctrl+G no chat) | — |

### Uso

```bash
# Uso temporário (só para esse comando)
OLLAMA_HOST=0.0.0.0:11434 ollama serve

# Uso permanente (adicionar ao ~/.zshrc)
export OLLAMA_HOST=0.0.0.0:11434
export OLLAMA_KEEP_ALIVE=10m
export OLLAMA_NUM_PARALLEL=2
export OLLAMA_FLASH_ATTENTION=1
export OLLAMA_CONTEXT_LENGTH=8192
```

---

## 📁 Caminhos dos Arquivos (macOS)

| O que | Caminho |
|---|---|
| Modelos baixados | `~/.ollama/models/` |
| Manifests dos modelos | `~/.ollama/models/manifests/` |
| Blobs dos modelos | `~/.ollama/models/blobs/` |
| LaunchAgent (auto-start) | `~/Library/LaunchAgents/com.ollama.ollama.plist` |
| Logs | `~/.ollama/logs/` |
| App | `/Applications/Ollama.app` |

### Ver espaço usado por modelos

```bash
du -sh ~/.ollama/models/
```

---

## 🔒 Verificar / Encerrar sem Iniciar o Serviço

> Lembrete: comandos `ollama` iniciam o serviço automaticamente. Use comandos do sistema para verificar sem iniciar.

| O que quer fazer | Comando (não inicia o serviço) |
|---|---|
| Ver se está rodando | `pgrep -fl ollama` |
| Ver se a porta está em uso | `lsof -i :11434` |
| Matar o processo | `pkill ollama` |
| Forçar encerramento | `pkill -9 ollama` |
| Confirmar que parou | `pgrep -fl ollama` (sem resultado = parado) |

### Problema: Ollama reinicia sozinho após `pkill`

Isso acontece porque o macOS registra um **LaunchAgent** que reinicia o processo automaticamente.

**Soluções:**

```bash
# Opção 1: Fechar pelo ícone na barra de menu (System Tray) → "Quit Ollama"
# Esta é a forma recomendada ✅

# Opção 2: Descarregar o LaunchAgent
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.ollama.ollama.plist 2>/dev/null
pkill -9 ollama

# Opção 3: Remover o LaunchAgent (mais radical)
rm ~/Library/LaunchAgents/com.ollama.ollama.plist
pkill -9 ollama
# ⚠️ Vai precisar reabrir o app Ollama pra registrar de novo
```

---

## 🧹 Limpeza Total

```bash
# 1. Fechar Ollama (System Tray ou CLI)
pkill -9 ollama

# 2. Remover todos os modelos
rm -rf ~/.ollama/models

# 3. Remover toda config do Ollama
rm -rf ~/.ollama

# 4. Remover o app (se instalou via .dmg)
rm -rf /Applications/Ollama.app

# 5. Remover LaunchAgent
rm -f ~/Library/LaunchAgents/com.ollama.ollama.plist
```

---

## 💡 Dicas Úteis

### Docker

A imagem oficial do Ollama está disponível no Docker Hub:

```bash
docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
```

### SDKs / Libraries

| Linguagem | Package |
|---|---|
| Python | [ollama-python](https://github.com/ollama/ollama-python) |
| JavaScript | [ollama-js](https://github.com/ollama/ollama-js) |

### Usar com VS Code / Cline / Claude Code

O Ollama pode ser usado como provedor de LLM local para ferramentas como Cline, Continue, etc.
Configure apontando para `http://localhost:11434`.

Ou use diretamente:
```bash
ollama launch claude
ollama launch codex
```

### Economizar memória

```bash
# Diminuir tempo que modelo fica em memória (padrão 5min)
OLLAMA_KEEP_ALIVE=1m ollama serve

# Ou descarregar manualmente após uso
ollama stop gemma3

# Ou via API
curl http://localhost:11434/api/generate -d '{"model": "gemma3", "keep_alive": 0}'
```

### Ver consumo de recursos

```bash
# Memória usada pelo Ollama
ps aux | grep ollama

# Modelos em memória com detalhes
ollama ps

# GPU (se tiver Apple Silicon)
sudo powermetrics --samplers gpu_power -i 1000 -n 1
```

### Community

- [Discord](https://discord.gg/ollama)
- [X (Twitter)](https://x.com/ollaborators)
- [Reddit](https://reddit.com/r/ollama)

---

## 📚 Referência de todos os comandos CLI

```
ollama
  run MODEL [PROMPT]     Run a model
  launch [INTEGRATION]   Launch integrations (claude, codex, droid, etc.)
  serve                  Start Ollama server
  pull MODEL             Pull a model from registry
  push MODEL             Push a model to registry
  create MODEL           Create a model from Modelfile
  show MODEL             Show model information
  list / ls              List downloaded models
  ps                     List running models
  stop MODEL             Stop a running model
  cp SOURCE DEST         Copy a model
  rm MODEL [MODEL...]    Remove model(s)
  signin / login         Sign in to ollama.com
  signout / logout       Sign out from ollama.com
  --version / -v         Show version
  --help / -h            Show help
```

---

*Última atualização: Dezembro 2026 — Baseado na documentação oficial do [Ollama GitHub](https://github.com/ollama/ollama)*
