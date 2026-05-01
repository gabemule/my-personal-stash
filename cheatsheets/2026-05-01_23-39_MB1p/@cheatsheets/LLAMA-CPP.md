# 🦙 llama.cpp — Cheat Sheet Completo

> Referência rápida para inferência local de LLMs com llama.cpp via linha de comando.
> Baseado na documentação oficial: [github.com/ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp) | llama.cpp v8680+

---

## 📋 Índice

- [Tabela Geral de Comandos](#-tabela-geral-de-comandos)
- [Instalação](#-instalação)
- [Modelos (GGUF)](#-modelos-gguf)
- [llama-cli — Chat e Geração de Texto](#-llama-cli--chat-e-geração-de-texto)
- [llama-server — Servidor API](#-llama-server--servidor-api)
- [llama-quantize — Quantização de Modelos](#-llama-quantize--quantização-de-modelos)
- [llama-embedding — Embeddings](#-llama-embedding--embeddings)
- [llama-bench — Benchmarks](#-llama-bench--benchmarks)
- [Parâmetros de Sampling](#-parâmetros-de-sampling)
- [Multimodal (Visão e Áudio)](#-multimodal-visão-e-áudio)
- [Speculative Decoding](#-speculative-decoding)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Caminhos dos Arquivos (macOS)](#-caminhos-dos-arquivos-macos)
- [Limpeza / Desinstalação](#-limpeza--desinstalação)
- [Troubleshooting](#-troubleshooting)
- [Dicas Úteis / Receitas](#-dicas-úteis--receitas)
- [Referência Completa de Binários](#-referência-completa-de-binários)

---

## 📊 Tabela Geral de Comandos

### Binários Principais

| Comando | O que faz |
|---|---|
| `llama-cli` | Chat interativo e geração de texto no terminal |
| `llama-server` | Servidor HTTP com API compatível com OpenAI + Web UI |
| `llama-quantize` | Quantiza modelos GGUF para menor tamanho |
| `llama-embedding` | Gera embeddings de texto |
| `llama-bench` | Benchmark de performance (tokens/s) |
| `llama-perplexity` | Calcula perplexidade de um modelo |
| `llama-imatrix` | Gera importance matrix para quantização otimizada |
| `llama-finetune` | Fine-tuning de modelos (LoRA) |
| `llama-tokenize` | Tokeniza texto e mostra tokens |
| `llama-gguf` | Inspeciona metadados de arquivos GGUF |
| `llama-gguf-split` | Divide/junta arquivos GGUF grandes |
| `llama-gguf-hash` | Calcula hash de arquivos GGUF |
| `convert_hf_to_gguf.py` | Converte modelos HuggingFace para GGUF |

### Binários Secundários

| Comando | O que faz |
|---|---|
| `llama-simple` | Geração simples (sem chat) |
| `llama-simple-chat` | Chat simples e mínimo |
| `llama-mtmd-cli` | CLI multimodal (imagem/áudio) |
| `llama-tts` | Text-to-speech |
| `llama-diffusion-cli` | Geração por difusão (modelos dLLM) |
| `llama-parallel` | Geração paralela com múltiplas sequências |
| `llama-speculative` | Decodificação especulativa com draft model |
| `llama-speculative-simple` | Decodificação especulativa simplificada |
| `llama-batched` | Decodificação em lote |
| `llama-batched-bench` | Benchmark de decodificação em lote |
| `llama-retrieval` | Retrieval com embeddings |
| `llama-lookahead` | Decodificação lookahead |
| `llama-lookup` | Decodificação lookup |
| `llama-lookup-create` | Cria tabela de lookup |
| `llama-lookup-merge` | Junta tabelas de lookup |
| `llama-lookup-stats` | Estatísticas de lookup |
| `llama-passkey` | Teste de passkey (contexto longo) |
| `llama-save-load-state` | Salva/carrega estado de sessão |
| `llama-eval-callback` | Callback de avaliação |
| `llama-fit-params` | Ajusta parâmetros automaticamente |
| `llama-idle` | Processo idle (servidor) |
| `llama-debug` | Debug de modelos |
| `llama-debug-template-parser` | Debug de templates de chat |
| `llama-template-analysis` | Análise de templates |
| `llama-results` | Exibe resultados formatados |
| `llama-gen-docs` | Gera documentação |
| `llama-completion` | Completions via CLI |

### Flags Comuns (compartilhadas entre binários)

| Flag | O que faz | Padrão |
|---|---|---|
| `-m, --model FNAME` | Caminho do modelo GGUF | — |
| `-hf, --hf-repo USER/MODEL[:QUANT]` | Baixa modelo do HuggingFace | — |
| `-p, --prompt PROMPT` | Prompt de entrada | — |
| `-sys, --system-prompt PROMPT` | System prompt | — |
| `-f, --file FNAME` | Arquivo com o prompt | — |
| `-n, --n-predict N` | Máx. de tokens a gerar | `-1` (infinito) |
| `-c, --ctx-size N` | Tamanho do contexto | `0` (do modelo) |
| `-t, --threads N` | Threads da CPU | `-1` (auto) |
| `-ngl, --n-gpu-layers N` | Camadas na GPU | `auto` |
| `-fa, --flash-attn [on\|off\|auto]` | Flash Attention | `auto` |
| `-b, --batch-size N` | Batch size lógico | `2048` |
| `-ub, --ubatch-size N` | Batch size físico | `512` |
| `--mlock` | Mantém modelo na RAM (sem swap) | desabilitado |
| `--mmap, --no-mmap` | Memory-map do modelo | habilitado |
| `-v, --verbose` | Saída detalhada | desabilitado |
| `--version` | Mostra versão | — |
| `-h, --help` | Mostra ajuda | — |

---

## 🚀 Instalação

### Via Homebrew (recomendado no macOS)

```bash
# Instalar llama.cpp
brew install llama.cpp

# Verificar versão
llama-cli --version

# Atualizar
brew upgrade llama.cpp

# Dependências instaladas automaticamente: ggml, openssl@3
```

### Verificar backends disponíveis

```bash
# Ao executar qualquer comando, o llama.cpp mostra os backends carregados:
# - BLAS (operações matemáticas)
# - MTL / Metal (GPU Apple Silicon)
# - CPU (específico para o chip, ex: apple_m1)

# Listar dispositivos disponíveis
llama-cli --list-devices
```

> 💡 **Dica:** No macOS com Apple Silicon, o backend Metal é habilitado automaticamente. O llama.cpp usa memória unificada — CPU e GPU compartilham a mesma RAM.

---

## 📦 Modelos (GGUF)

### O que é GGUF?

GGUF (GGML Unified Format) é o formato de modelo usado pelo llama.cpp. Modelos precisam estar neste formato para serem executados.

### Onde encontrar modelos

| Fonte | URL |
|---|---|
| HuggingFace | [huggingface.co/models?sort=trending&search=gguf](https://huggingface.co/models?sort=trending&search=gguf) |
| ggml-org (oficial) | [huggingface.co/ggml-org](https://huggingface.co/ggml-org) |

### Baixar modelos do HuggingFace (via CLI)

```bash
# Baixar modelo direto pelo llama-cli (download automático para cache)
llama-cli -hf ggml-org/Qwen2.5-Coder-1.5B-Instruct-GGUF -p "hello"

# Especificar quantização
llama-cli -hf ggml-org/GLM-4.7-Flash-GGUF:Q4_K_M -p "hello"

# Usar modelo local já baixado
llama-cli -m ~/models/meu-modelo.gguf -p "hello"
```

> 💡 **Dica:** Ao usar `-hf`, o modelo é baixado automaticamente para o cache em `~/.cache/llama.cpp/`. Se o modelo já estiver no cache, não é baixado novamente.

### Tipos de Quantização (do menor para o maior)

| Tipo | Bits/Peso | Tamanho (8B) | Qualidade | Uso recomendado |
|---|---|---|---|---|
| `IQ1_S` | 1.56 bpw | ~1.5G | Muito baixa | Apenas testes |
| `IQ2_XXS` | 2.06 bpw | ~2.0G | Baixa | Muito limitado em RAM |
| `Q2_K` | 2.96 bpw | ~3.0G | Baixa | Limitado em RAM |
| `IQ3_XS` | 3.3 bpw | ~3.3G | Aceitável | Dispositivos com pouca RAM |
| `Q3_K_M` | — | ~3.7G | Razoável | Boa relação para pouca RAM |
| `Q4_0` | — | ~4.3G | Boa | Padrão básico |
| `Q4_K_M` | — | ~4.6G | **Boa** | **Recomendado geral** |
| `Q5_K_M` | — | ~5.3G | Muito boa | Quem tem mais RAM |
| `Q6_K` | — | ~6.1G | Excelente | Alta qualidade |
| `Q8_0` | — | ~8.0G | Quase perfeita | Muito fiel ao original |
| `F16` | — | ~14.0G | Original | Precisão máxima |
| `BF16` | — | ~14.0G | Original | Precisão máxima (bfloat) |

> **Importante:** `Q4_K_M` é o padrão ao usar `-hf` sem especificar quantização. É o melhor equilíbrio entre tamanho e qualidade para a maioria dos casos.

### Converter modelo HuggingFace para GGUF

```bash
# O script de conversão é instalado com o llama.cpp
convert_hf_to_gguf.py --help

# Converter modelo (requer Python + dependências)
convert_hf_to_gguf.py /caminho/modelo-hf/ --outfile modelo.gguf --outtype f16
```

### Inspecionar modelo GGUF

```bash
# Ver metadados do modelo
llama-gguf /caminho/modelo.gguf

# Dividir modelo grande em partes
llama-gguf-split --split --split-max-size 4G modelo.gguf modelo-split

# Juntar partes de modelo
llama-gguf-split --merge modelo-split-00001-of-00003.gguf modelo-completo.gguf

# Calcular hash de modelo
llama-gguf-hash modelo.gguf
```

---

## 💬 llama-cli — Chat e Geração de Texto

### Uso básico

```bash
# Chat interativo com modelo local
llama-cli -m modelo.gguf -cnv

# Chat interativo com modelo do HuggingFace
llama-cli -hf ggml-org/Qwen2.5-Coder-1.5B-Instruct-GGUF -cnv

# Gerar texto com prompt direto
llama-cli -m modelo.gguf -p "Explique o que é machine learning" -n 256

# Gerar com system prompt
llama-cli -m modelo.gguf -cnv -sys "Você é um assistente que responde em português"

# System prompt de arquivo
llama-cli -m modelo.gguf -cnv -sysf system-prompt.txt

# Prompt de arquivo
llama-cli -m modelo.gguf -f prompt.txt -n 512
```

### Flags específicas do llama-cli

| Flag | O que faz | Padrão |
|---|---|---|
| `-cnv, --conversation` | Modo conversação (chat) | auto (se template disponível) |
| `-no-cnv, --no-conversation` | Desabilita modo conversação | — |
| `-st, --single-turn` | Apenas uma interação, depois sai | `false` |
| `-sys, --system-prompt PROMPT` | System prompt | — |
| `-sysf, --system-prompt-file FILE` | System prompt de arquivo | — |
| `-r, --reverse-prompt PROMPT` | Para geração ao encontrar este texto | — |
| `-co, --color [on\|off\|auto]` | Colorir saída (prompt vs geração) | `auto` |
| `--display-prompt` | Exibe o prompt na geração | `true` |
| `--no-display-prompt` | Oculta o prompt na geração | — |
| `-sp, --special` | Exibe tokens especiais | `false` |
| `--context-shift` | Shift de contexto em geração infinita | desabilitado |
| `-mli, --multiline-input` | Permite entrada multilinha | desabilitado |
| `--simple-io` | IO simplificado (subprocessos) | desabilitado |
| `--warmup, --no-warmup` | Aquecimento antes de gerar | habilitado |
| `--show-timings` | Mostra métricas de tempo após resposta | `true` |

### Controle de contexto e cache

| Flag | O que faz | Padrão |
|---|---|---|
| `-c, --ctx-size N` | Tamanho do contexto | `0` (do modelo) |
| `--keep N` | Tokens do prompt inicial a manter | `0` |
| `-ctxcp, --ctx-checkpoints N` | Checkpoints de contexto por slot | `32` |
| `-cpent, --checkpoint-every-n-tokens N` | Checkpoint a cada N tokens | `8192` |
| `-cram, --cache-ram N` | Máx. cache em MiB | `8192` |
| `-ctk, --cache-type-k TYPE` | Tipo do KV cache (K) | `f16` |
| `-ctv, --cache-type-v TYPE` | Tipo do KV cache (V) | `f16` |

### Reasoning / Thinking

```bash
# Ativar modo de raciocínio (thinking)
llama-cli -m modelo.gguf -cnv -rea on

# Definir orçamento de tokens para thinking
llama-cli -m modelo.gguf -cnv -rea on --reasoning-budget 1024

# Formato de reasoning (deepseek, none, etc.)
llama-cli -m modelo.gguf -cnv --reasoning-format deepseek
```

| Flag | O que faz | Padrão |
|---|---|---|
| `-rea, --reasoning [on\|off\|auto]` | Ativa raciocínio/thinking | `auto` |
| `--reasoning-budget N` | Orçamento de tokens para thinking | `-1` (ilimitado) |
| `--reasoning-format FORMAT` | Formato: `none`, `deepseek`, `deepseek-legacy` | `auto` |

### GPU e Performance

```bash
# Colocar todas as camadas na GPU
llama-cli -m modelo.gguf -ngl 99 -cnv

# Flash Attention (mais rápido, menos memória)
llama-cli -m modelo.gguf -fa on -cnv

# Definir número de threads
llama-cli -m modelo.gguf -t 8 -cnv

# Manter modelo na RAM (sem swap)
llama-cli -m modelo.gguf --mlock -cnv

# Auto-ajustar para caber na memória do dispositivo
llama-cli -m modelo.gguf --fit on -cnv
```

| Flag | O que faz | Padrão |
|---|---|---|
| `-ngl, --n-gpu-layers N` | Camadas na GPU (`auto`, `all`, ou número) | `auto` |
| `-fa, --flash-attn [on\|off\|auto]` | Flash Attention | `auto` |
| `-t, --threads N` | Threads para geração | `-1` (auto) |
| `-tb, --threads-batch N` | Threads para processamento de batch | mesmo que `-t` |
| `--mlock` | Forçar modelo na RAM | desabilitado |
| `--mmap, --no-mmap` | Memory-map (carga mais rápida) | habilitado |
| `--fit [on\|off]` | Auto-ajustar parâmetros à memória | `on` |
| `-fitt, --fit-target MiB` | Margem de memória para --fit | `1024` |
| `-sm, --split-mode {none\|layer\|row}` | Como dividir modelo entre GPUs | `layer` |
| `-mg, --main-gpu INDEX` | GPU principal | `0` |

### LoRA e Control Vectors

```bash
# Carregar adaptador LoRA
llama-cli -m modelo.gguf --lora adapter.gguf -cnv

# LoRA com escala customizada
llama-cli -m modelo.gguf --lora-scaled adapter.gguf:0.5 -cnv

# Control vector
llama-cli -m modelo.gguf --control-vector cv.gguf -cnv

# Control vector com escala
llama-cli -m modelo.gguf --control-vector-scaled cv.gguf:1.5 -cnv
```

### Chat templates

```bash
# Usar template built-in específico
llama-cli -m modelo.gguf --chat-template chatml -cnv

# Usar template de arquivo
llama-cli -m modelo.gguf --chat-template-file meu-template.jinja -cnv

# Templates built-in disponíveis:
# chatml, llama2, llama3, llama4, deepseek, deepseek2, deepseek3,
# gemma, phi3, phi4, mistral-v1, mistral-v3, mistral-v7,
# command-r, falcon3, vicuna, openchat, zephyr, e muitos outros
```

### Grammars e JSON Schema

```bash
# Forçar saída com grammar BNF
llama-cli -m modelo.gguf -p "Liste 3 frutas" --grammar 'root ::= "[" item ("," item)* "]" item ::= "\"" [a-zA-Z]+ "\""'

# Grammar de arquivo
llama-cli -m modelo.gguf -p "Liste 3 frutas" --grammar-file grammar.gbnf

# Forçar saída JSON com schema
llama-cli -m modelo.gguf -p "Dados do usuário" -j '{"type":"object","properties":{"nome":{"type":"string"},"idade":{"type":"integer"}}}'

# JSON schema de arquivo
llama-cli -m modelo.gguf -p "Dados do usuário" -jf schema.json
```

---

## 🌐 llama-server — Servidor API

### Uso básico

```bash
# Iniciar servidor com modelo local
llama-server -m modelo.gguf

# Iniciar com modelo do HuggingFace
llama-server -hf ggml-org/Qwen2.5-Coder-1.5B-Instruct-GGUF

# Especificar host e porta
llama-server -m modelo.gguf --host 0.0.0.0 --port 8080

# Servidor com múltiplos slots (requisições paralelas)
llama-server -m modelo.gguf -np 4

# Com Flash Attention e contexto grande
llama-server -m modelo.gguf -fa on -c 8192

# Com chave de API
llama-server -m modelo.gguf --api-key "minha-chave-secreta"

# Desabilitar Web UI
llama-server -m modelo.gguf --no-webui
```

> 💡 **Dica:** Após iniciar, acesse `http://127.0.0.1:8080` no navegador para usar a Web UI integrada.

### Flags específicas do servidor

| Flag | O que faz | Padrão |
|---|---|---|
| `--host HOST` | IP para escutar | `127.0.0.1` |
| `--port PORT` | Porta | `8080` |
| `-np, --parallel N` | Slots paralelos (requisições simultâneas) | `-1` (auto) |
| `--api-key KEY` | Chave(s) de API (vírgulas para múltiplas) | nenhuma |
| `--api-key-file FILE` | Arquivo com chaves de API | — |
| `--webui, --no-webui` | Habilitar Web UI | habilitado |
| `--embedding, --embeddings` | Habilitar endpoint de embeddings | desabilitado |
| `--rerank, --reranking` | Habilitar endpoint de reranking | desabilitado |
| `--metrics` | Endpoint Prometheus `/metrics` | desabilitado |
| `--slots, --no-slots` | Endpoint de monitoramento de slots | habilitado |
| `-to, --timeout N` | Timeout de read/write em segundos | `600` |
| `--threads-http N` | Threads para processar HTTP | `-1` (auto) |
| `-cb, --cont-batching` | Batching contínuo (dinâmico) | habilitado |
| `--cache-prompt` | Cache de prompts | habilitado |
| `--cache-reuse N` | Min. chunk para reutilizar cache via KV shift | `0` |
| `-a, --alias STRING` | Alias do modelo (para API) | — |
| `--path PATH` | Servir arquivos estáticos deste caminho | — |
| `--api-prefix PREFIX` | Prefixo de path da API | — |
| `--ssl-key-file FILE` | Chave SSL (HTTPS) | — |
| `--ssl-cert-file FILE` | Certificado SSL (HTTPS) | — |
| `-sps, --slot-prompt-similarity N` | Similaridade mín. de prompt para slot | `0.10` |

### Servidor como Router (múltiplos modelos)

```bash
# Servir diretório de modelos (carrega sob demanda)
llama-server --models-dir ~/models/

# Limitar máximo de modelos simultâneos
llama-server --models-dir ~/models/ --models-max 2

# Desabilitar auto-load
llama-server --models-dir ~/models/ --no-models-autoload
```

| Flag | O que faz | Padrão |
|---|---|---|
| `--models-dir PATH` | Diretório com modelos | desabilitado |
| `--models-preset FILE` | Arquivo INI com presets | — |
| `--models-max N` | Máx. modelos carregados | `4` |
| `--models-autoload, --no-models-autoload` | Auto-carregar modelos | habilitado |

### Ferramentas Built-in (Agentes)

```bash
# Habilitar todas as ferramentas
llama-server -m modelo.gguf --tools all

# Habilitar ferramentas específicas
llama-server -m modelo.gguf --tools read_file,exec_shell_command

# Ferramentas disponíveis:
# read_file, file_glob_search, grep_search,
# exec_shell_command, write_file, edit_file, apply_diff
```

> ⚠️ **Atenção:** Não habilite `--tools` em ambientes não confiáveis. Ferramentas como `exec_shell_command` permitem execução de comandos no sistema.

### MCP Proxy (experimental)

```bash
# Habilitar proxy MCP para Web UI
llama-server -m modelo.gguf --webui-mcp-proxy
```

### API Compatível com OpenAI

O servidor expõe endpoints compatíveis com a API da OpenAI:

```bash
# Chat completions (streaming)
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "modelo",
    "messages": [
      {"role": "system", "content": "Você é um assistente útil."},
      {"role": "user", "content": "Olá!"}
    ],
    "stream": true
  }'

# Completions (texto puro)
curl http://localhost:8080/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "modelo",
    "prompt": "Era uma vez",
    "max_tokens": 100
  }'

# Embeddings
curl http://localhost:8080/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "model": "modelo",
    "input": "Texto para embeddings"
  }'

# Listar modelos
curl http://localhost:8080/v1/models

# Health check
curl http://localhost:8080/health
```

### Endpoints Nativos

| Endpoint | Método | O que faz |
|---|---|---|
| `/v1/chat/completions` | POST | Chat completions (OpenAI-compatível) |
| `/v1/completions` | POST | Text completions |
| `/v1/embeddings` | POST | Embeddings (requer `--embeddings`) |
| `/v1/models` | GET | Lista modelos disponíveis |
| `/health` | GET | Status do servidor |
| `/metrics` | GET | Métricas Prometheus (requer `--metrics`) |
| `/slots` | GET | Status dos slots |
| `/props` | GET/POST | Propriedades do servidor (requer `--props`) |
| `/infill` | POST | Code infill (FIM) |
| `/tokenize` | POST | Tokeniza texto |
| `/detokenize` | POST | Detokeniza tokens |
| `/lora-adapters` | GET/POST | Gerencia LoRA adapters |

### Usar com clientes OpenAI

```bash
# Python (openai SDK)
# pip install openai

# Configurar para apontar ao llama-server
export OPENAI_API_BASE=http://localhost:8080/v1
export OPENAI_API_KEY=dummy
```

```python
# Exemplo com openai SDK
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8080/v1",
    api_key="dummy"  # qualquer valor se não usar --api-key
)

response = client.chat.completions.create(
    model="modelo",
    messages=[
        {"role": "user", "content": "Olá!"}
    ]
)
print(response.choices[0].message.content)
```

---

## 🔧 llama-quantize — Quantização de Modelos

### Uso básico

```bash
# Quantizar modelo F16 para Q4_K_M
llama-quantize modelo-f16.gguf modelo-q4km.gguf Q4_K_M

# Usar múltiplas threads
llama-quantize modelo-f16.gguf modelo-q4km.gguf Q4_K_M 8

# Simulação (mostra tamanho final sem quantizar)
llama-quantize --dry-run modelo-f16.gguf Q4_K

# Com importance matrix (melhor qualidade)
llama-quantize --imatrix imatrix.dat modelo-f16.gguf modelo-q4km.gguf Q4_K_M
```

### Flags do llama-quantize

| Flag | O que faz |
|---|---|
| `--allow-requantize` | Permite re-quantizar modelos já quantizados (⚠️ reduz qualidade) |
| `--leave-output-tensor` | Não quantiza output.weight (mais tamanho, melhor qualidade) |
| `--pure` | Desabilita k-quant mixtures, quantiza tudo igual |
| `--imatrix FILE` | Usa importance matrix para otimizar quantização |
| `--include-weights TENSOR` | Aplica imatrix apenas nesses tensors |
| `--exclude-weights TENSOR` | Não aplica imatrix nesses tensors |
| `--output-tensor-type TYPE` | Tipo do tensor de saída |
| `--token-embedding-type TYPE` | Tipo do tensor de embedding |
| `--tensor-type PATTERN=TYPE` | Quantização seletiva por tensor |
| `--tensor-type-file FILE` | Arquivo com tipos por tensor |
| `--prune-layers L0,L1,...` | Remove camadas específicas (⚠️ avançado) |
| `--keep-split` | Mantém mesma divisão de shards do input |
| `--override-kv KEY=TYPE:VALUE` | Sobrescreve metadados do modelo |
| `--dry-run` | Calcula tamanho final sem quantizar |

### Tipos de quantização disponíveis

| Tipo | Tamanho (8B) | Perda ppl | Notas |
|---|---|---|---|
| `Q4_K_M` | 4.58G | +0.1754 | **Recomendado** — melhor custo-benefício |
| `Q4_K_S` | 4.37G | +0.2689 | Menor que Q4_K_M |
| `Q4_0` | 4.34G | +0.4685 | Básico, sem k-quant |
| `Q5_K_M` | 5.33G | +0.0569 | Excelente qualidade |
| `Q5_K_S` | 5.21G | +0.1049 | Boa qualidade |
| `Q6_K` | 6.14G | +0.0217 | Quase sem perda |
| `Q8_0` | 7.96G | +0.0026 | Praticamente perfeito |
| `Q3_K_M` | 3.74G | +0.6569 | Aceitável para pouca RAM |
| `Q3_K_L` | 4.03G | +0.5562 | Melhor que Q3_K_M |
| `Q2_K` | 2.96G | +3.5199 | Muita perda, apenas emergência |
| `IQ4_XS` | — | — | Non-linear, 4.25 bpw |
| `IQ3_M` | — | — | Non-linear mix, 3.66 bpw |
| `F16` | 14.00G | +0.0020 | Precisão original (16-bit) |
| `BF16` | 14.00G | -0.0050 | Brain float 16-bit |
| `F32` | 26.00G | 0 | Precisão total |

### Gerar Importance Matrix

```bash
# Gerar imatrix a partir de dados de calibração
llama-imatrix -m modelo-f16.gguf -f dados-calibracao.txt -o imatrix.dat

# Usar imatrix na quantização
llama-quantize --imatrix imatrix.dat modelo-f16.gguf modelo-iq4xs.gguf IQ4_XS
```

> 💡 **Dica:** A importance matrix é especialmente útil para quantizações agressivas (IQ2, IQ3, IQ4). Para Q4_K_M e acima, a diferença é mínima.

---

## 📐 llama-embedding — Embeddings

### Uso básico

```bash
# Gerar embedding de um texto
llama-embedding -m modelo-embedding.gguf -p "Texto para embedding"

# Múltiplas frases (separadas por \n)
llama-embedding -m modelo-embedding.gguf -p "Frase 1\nFrase 2\nFrase 3"

# Saída em formato JSON (OpenAI-compatível)
llama-embedding -m modelo-embedding.gguf -p "Texto" --embd-output-format json

# Com cosine similarity matrix
llama-embedding -m modelo-embedding.gguf -p "Texto 1\nTexto 2" --embd-output-format json+

# Normalização (padrão: euclidiana)
llama-embedding -m modelo-embedding.gguf -p "Texto" --embd-normalize 2

# Usar modelo padrão EmbeddingGemma
llama-embedding --embd-gemma-default -p "Texto"
```

### Flags específicas de embedding

| Flag | O que faz | Padrão |
|---|---|---|
| `--pooling {none\|mean\|cls\|last\|rank}` | Tipo de pooling | do modelo |
| `--attention {causal\|non-causal}` | Tipo de atenção | do modelo |
| `--embd-normalize N` | Normalização: -1=none, 0=max int16, 1=taxicab, 2=euclidean | `2` |
| `--embd-output-format FMT` | Formato: array, json, json+, raw | padrão |
| `--embd-separator STRING` | Separador entre embeddings | `\n` |

---

## 📊 llama-bench — Benchmarks

### Uso básico

```bash
# Benchmark de modelo local
llama-bench -m modelo.gguf

# Benchmark com modelo do HuggingFace
llama-bench -hf ggml-org/Qwen2.5-Coder-1.5B-Instruct-GGUF

# Formato de saída (md, csv, json, jsonl, sql)
llama-bench -m modelo.gguf -o json

# Comparar diferentes configurações
llama-bench -m modelo.gguf -ngl 0,99 -fa 0,1

# Comparar diferentes modelos
llama-bench -m modelo1.gguf,modelo2.gguf

# Definir tamanho do prompt e geração
llama-bench -m modelo.gguf -p 512 -n 128

# Mais repetições para resultado mais preciso
llama-bench -m modelo.gguf -r 10

# Mostrar progresso
llama-bench -m modelo.gguf --progress
```

### Flags do llama-bench

| Flag | O que faz | Padrão |
|---|---|---|
| `-m, --model FILE` | Modelo(s) para benchmark | — |
| `-hf, --hf-repo USER/MODEL` | Modelo do HuggingFace | — |
| `-p, --n-prompt N` | Tokens no prompt | `512` |
| `-n, --n-gen N` | Tokens a gerar | `128` |
| `-pg PP,TG` | Prompt e geração combinados | — |
| `-r, --repetitions N` | Repetições de cada teste | `5` |
| `-o, --output FMT` | Formato: md, csv, json, jsonl, sql | `md` |
| `-t, --threads N` | Threads | `4` |
| `-ngl, --n-gpu-layers N` | Camadas na GPU | `99` |
| `-fa, --flash-attn 0\|1` | Flash Attention | `0` |
| `-b, --batch-size N` | Batch size | `2048` |
| `--progress` | Mostrar indicadores de progresso | desabilitado |
| `--no-warmup` | Pular warmup | desabilitado |
| `--delay N` | Delay entre testes (segundos) | `0` |

> 💡 **Dica:** Múltiplos valores podem ser passados separados por vírgula: `-ngl 0,99 -fa 0,1` testa todas as combinações.

---

## 🎛️ Parâmetros de Sampling

Parâmetros usados por `llama-cli` e `llama-server` para controlar a geração de texto:

### Samplers e Temperatura

| Flag | O que faz | Padrão |
|---|---|---|
| `--samplers SAMPLERS` | Ordem dos samplers (separados por `;`) | — |
| `--seed N` | Seed para reprodutibilidade | `-1` (aleatório) |
| `--temp N` | Temperatura (0 = greedy) | `0.80` |
| `--top-k N` | Top-K sampling (0 = desabilitado) | `40` |
| `--top-p N` | Top-P / Nucleus sampling | `0.95` |
| `--min-p N` | Min-P sampling | `0.05` |
| `--typical-p N` | Locally typical sampling | `1.00` (desabilitado) |

### Penalidades de Repetição

| Flag | O que faz | Padrão |
|---|---|---|
| `--repeat-penalty N` | Penalidade de repetição | `1.00` (desabilitado) |
| `--repeat-last-n N` | Últimos N tokens para penalidade | `64` |
| `--presence-penalty N` | Penalidade de presença | `0.00` |
| `--frequency-penalty N` | Penalidade de frequência | `0.00` |

### DRY Sampling (repetição avançada)

| Flag | O que faz | Padrão |
|---|---|---|
| `--dry-multiplier N` | Multiplicador DRY | `0.00` (desabilitado) |
| `--dry-base N` | Base DRY | `1.75` |
| `--dry-allowed-length N` | Comprimento permitido | `2` |
| `--dry-penalty-last-n N` | Tokens para penalidade | `-1` (contexto) |

### Mirostat

| Flag | O que faz | Padrão |
|---|---|---|
| `--mirostat N` | Modo Mirostat (0=off, 1=v1, 2=v2) | `0` |
| `--mirostat-lr N` | Learning rate (eta) | `0.10` |
| `--mirostat-ent N` | Entropia alvo (tau) | `5.00` |

### Temperatura Dinâmica

| Flag | O que faz | Padrão |
|---|---|---|
| `--dynatemp-range N` | Range de temperatura dinâmica | `0.00` (desabilitado) |
| `--dynatemp-exp N` | Expoente de temperatura dinâmica | `1.00` |

---

## 🖼️ Multimodal (Visão e Áudio)

### Modelos com visão

```bash
# Usar modelo multimodal com projetor automático (via -hf)
llama-cli -hf usuario/modelo-vision-GGUF -cnv --image foto.jpg

# Especificar projetor manualmente
llama-cli -m modelo.gguf -mm projector.gguf --image foto.jpg -cnv

# Múltiplas imagens
llama-cli -m modelo.gguf -mm projector.gguf --image foto1.jpg,foto2.jpg -cnv

# CLI multimodal dedicado
llama-mtmd-cli -m modelo.gguf -mm projector.gguf --image foto.jpg -cnv

# Modelos default de visão (download automático)
llama-cli --vision-gemma-4b-default --image foto.jpg -cnv
llama-cli --vision-gemma-12b-default --image foto.jpg -cnv
```

### Modelos com áudio

```bash
# Text-to-speech
llama-tts -m modelo-tts.gguf -p "Olá, mundo!"

# TTS com vocoder
llama-tts -m modelo.gguf -mv vocoder.gguf -p "Texto para falar"
```

### Flags multimodais

| Flag | O que faz | Padrão |
|---|---|---|
| `-mm, --mmproj FILE` | Projetor multimodal | — |
| `-mmu, --mmproj-url URL` | URL do projetor | — |
| `--mmproj-auto, --no-mmproj` | Auto-detectar projetor (com -hf) | habilitado |
| `--image, --audio FILE` | Imagem ou áudio (vírgulas para múltiplos) | — |
| `--image-min-tokens N` | Mín. tokens por imagem | do modelo |
| `--image-max-tokens N` | Máx. tokens por imagem | do modelo |

---

## ⚡ Speculative Decoding

Speculative decoding usa um modelo menor (draft) para prever tokens, acelerando a geração:

```bash
# Com draft model do HuggingFace
llama-cli -m modelo-grande.gguf -md modelo-draft.gguf -cnv

# Via HuggingFace repos
llama-cli -hf usuario/modelo-grande-GGUF -hfd usuario/modelo-draft-GGUF -cnv

# Configurar número de tokens draft
llama-cli -m modelo.gguf -md draft.gguf --draft 16 -cnv

# Probabilidade mínima de aceitação
llama-cli -m modelo.gguf -md draft.gguf --draft-p-min 0.75 -cnv

# Speculative sem draft model (n-gram)
llama-server -m modelo.gguf --spec-type ngram-simple

# Presets com speculative (download automático)
llama-server --fim-qwen-7b-spec
llama-server --fim-qwen-14b-spec
```

| Flag | O que faz | Padrão |
|---|---|---|
| `-md, --model-draft FILE` | Modelo draft | — |
| `-hfd, --hf-repo-draft USER/MODEL` | Draft model do HuggingFace | — |
| `--draft, --draft-max N` | Tokens a prever com draft | `16` |
| `--draft-min N` | Mín. draft tokens | `0` |
| `--draft-p-min P` | Probabilidade mín. de aceitação (greedy) | `0.75` |
| `-cd, --ctx-size-draft N` | Contexto do draft | `0` (do modelo) |
| `-ngld, --n-gpu-layers-draft N` | Camadas GPU do draft | `auto` |
| `--spec-type TYPE` | Tipo sem draft model: ngram-simple, ngram-cache, etc. | `none` |

---

## 🔑 Variáveis de Ambiente

### Modelo e HuggingFace

| Variável | O que faz | Padrão |
|---|---|---|
| `LLAMA_ARG_MODEL` | Caminho do modelo | — |
| `LLAMA_ARG_MODEL_URL` | URL para download do modelo | — |
| `LLAMA_ARG_HF_REPO` | Repositório HuggingFace | — |
| `LLAMA_ARG_HF_FILE` | Arquivo no repositório HF | — |
| `LLAMA_ARG_MODEL_DRAFT` | Modelo draft | — |
| `LLAMA_ARG_HFD_REPO` | Repositório HF do draft | — |
| `HF_TOKEN` | Token de acesso HuggingFace | — |
| `LLAMA_ARG_DOCKER_REPO` | Repositório Docker Hub | — |
| `LLAMA_OFFLINE` | Modo offline (usa apenas cache) | — |

### Contexto e Performance

| Variável | O que faz | Padrão |
|---|---|---|
| `LLAMA_ARG_CTX_SIZE` | Tamanho do contexto | `0` |
| `LLAMA_ARG_N_PREDICT` | Máx. tokens a gerar | `-1` |
| `LLAMA_ARG_THREADS` | Threads da CPU | `-1` |
| `LLAMA_ARG_BATCH` | Batch size lógico | `2048` |
| `LLAMA_ARG_UBATCH` | Batch size físico | `512` |
| `LLAMA_ARG_N_GPU_LAYERS` | Camadas na GPU | `auto` |
| `LLAMA_ARG_FLASH_ATTN` | Flash Attention | `auto` |
| `LLAMA_ARG_SPLIT_MODE` | Modo de divisão entre GPUs | `layer` |
| `LLAMA_ARG_MAIN_GPU` | GPU principal | `0` |
| `LLAMA_ARG_MLOCK` | Forçar modelo na RAM | — |
| `LLAMA_ARG_MMAP` | Memory-map | — |
| `LLAMA_ARG_FIT` | Auto-ajustar à memória | `on` |

### Cache e KV

| Variável | O que faz | Padrão |
|---|---|---|
| `LLAMA_ARG_CACHE_TYPE_K` | Tipo KV cache (K) | `f16` |
| `LLAMA_ARG_CACHE_TYPE_V` | Tipo KV cache (V) | `f16` |
| `LLAMA_ARG_CACHE_RAM` | Máx. cache em MiB | `8192` |
| `LLAMA_ARG_CACHE_PROMPT` | Cache de prompts (server) | habilitado |
| `LLAMA_ARG_CACHE_REUSE` | Reutilização de cache | `0` |

### Servidor (llama-server)

| Variável | O que faz | Padrão |
|---|---|---|
| `LLAMA_ARG_HOST` | Host do servidor | `127.0.0.1` |
| `LLAMA_ARG_PORT` | Porta do servidor | `8080` |
| `LLAMA_ARG_N_PARALLEL` | Slots paralelos | `-1` |
| `LLAMA_API_KEY` | Chave de API | — |
| `LLAMA_ARG_TIMEOUT` | Timeout em segundos | `600` |
| `LLAMA_ARG_THREADS_HTTP` | Threads HTTP | `-1` |
| `LLAMA_ARG_CONT_BATCHING` | Batching contínuo | habilitado |
| `LLAMA_ARG_EMBEDDINGS` | Endpoint de embeddings | desabilitado |
| `LLAMA_ARG_RERANKING` | Endpoint de reranking | desabilitado |
| `LLAMA_ARG_ENDPOINT_METRICS` | Endpoint Prometheus | desabilitado |
| `LLAMA_ARG_ENDPOINT_SLOTS` | Endpoint de slots | habilitado |
| `LLAMA_ARG_WEBUI` | Web UI | habilitado |
| `LLAMA_ARG_TOOLS` | Ferramentas built-in | nenhuma |
| `LLAMA_ARG_MODELS_DIR` | Diretório de modelos (router) | — |
| `LLAMA_ARG_MODELS_MAX` | Máx. modelos (router) | `4` |

### Reasoning / Thinking

| Variável | O que faz | Padrão |
|---|---|---|
| `LLAMA_ARG_REASONING` | Raciocínio on/off/auto | `auto` |
| `LLAMA_ARG_THINK` | Formato de reasoning | `auto` |
| `LLAMA_ARG_THINK_BUDGET` | Orçamento de tokens | `-1` |

### Chat Templates

| Variável | O que faz | Padrão |
|---|---|---|
| `LLAMA_ARG_CHAT_TEMPLATE` | Template de chat | do modelo |
| `LLAMA_ARG_CHAT_TEMPLATE_FILE` | Arquivo de template | — |
| `LLAMA_ARG_JINJA` | Habilitar Jinja | habilitado |
| `LLAMA_CHAT_TEMPLATE_KWARGS` | Parâmetros adicionais (JSON) | — |

### Logging

| Variável | O que faz | Padrão |
|---|---|---|
| `LLAMA_LOG_VERBOSITY` | Nível: 0=output, 1=error, 2=warn, 3=info, 4=debug | `1` |
| `LLAMA_LOG_FILE` | Arquivo de log | — |
| `LLAMA_LOG_COLORS` | Log colorido | `auto` |
| `LLAMA_LOG_PREFIX` | Prefixo em log | desabilitado |
| `LLAMA_LOG_TIMESTAMPS` | Timestamps em log | desabilitado |

### Sampling

| Variável | O que faz | Padrão |
|---|---|---|
| `LLAMA_ARG_TOP_K` | Top-K | `40` |
| `LLAMA_ARG_BACKEND_SAMPLING` | Backend sampling (experimental) | desabilitado |

---

## 📁 Caminhos dos Arquivos (macOS)

| O que | Caminho |
|---|---|
| Binários (Homebrew) | `/opt/homebrew/bin/llama-*` |
| Instalação (Homebrew) | `/opt/homebrew/Cellar/llama.cpp/8680/` |
| Backend GGML (Metal) | `/opt/homebrew/Cellar/ggml/0.9.11/libexec/libggml-metal.so` |
| Backend GGML (CPU) | `/opt/homebrew/Cellar/ggml/0.9.11/libexec/libggml-cpu-apple_m1.so` |
| Backend GGML (BLAS) | `/opt/homebrew/Cellar/ggml/0.9.11/libexec/libggml-blas.so` |
| Cache de modelos (HF) | `~/.cache/llama.cpp/` |
| Cache HuggingFace | `~/.cache/huggingface/` |
| Conversor Python | `/opt/homebrew/bin/convert_hf_to_gguf.py` |

---

## 🧹 Limpeza / Desinstalação

```bash
# Remover llama.cpp
brew uninstall llama.cpp

# Remover dependência ggml (se não usada por outro pacote)
brew uninstall ggml

# Limpar cache de modelos baixados
rm -rf ~/.cache/llama.cpp/

# Limpar cache do HuggingFace (cuidado: remove todos os modelos HF)
rm -rf ~/.cache/huggingface/

# Verificar espaço usado por modelos
du -sh ~/.cache/llama.cpp/
du -sh ~/.cache/huggingface/

# Limpeza geral do Homebrew (remove versões antigas)
brew cleanup llama.cpp
```

---

## 🔧 Troubleshooting

### Modelo não encontrado

```bash
# Verificar se o modelo existe
ls -la modelo.gguf

# Verificar modelos no cache
llama-cli --cache-list

# Forçar re-download
rm -rf ~/.cache/llama.cpp/
llama-cli -hf usuario/modelo-GGUF -p "teste"
```

### Erro de memória (out of memory)

```bash
# Usar quantização menor
llama-cli -hf usuario/modelo-GGUF:Q4_K_M -cnv

# Reduzir contexto
llama-cli -m modelo.gguf -c 2048 -cnv

# Reduzir camadas na GPU
llama-cli -m modelo.gguf -ngl 20 -cnv

# Quantizar KV cache
llama-cli -m modelo.gguf -ctk q4_0 -ctv q4_0 -cnv

# Verificar memória disponível
llama-cli --list-devices
```

### Geração lenta

```bash
# Usar Flash Attention
llama-cli -m modelo.gguf -fa on -cnv

# Aumentar batch size
llama-cli -m modelo.gguf -b 4096 -ub 1024 -cnv

# Verificar que GPU está sendo usada
llama-cli -m modelo.gguf -v -cnv 2>&1 | head -30
# Deve mostrar: "loaded MTL backend"

# Benchmark para comparar configurações
llama-bench -m modelo.gguf -ngl 0,99 -fa 0,1
```

### Servidor não responde

```bash
# Verificar se está rodando
curl http://localhost:8080/health

# Verificar slots disponíveis
curl http://localhost:8080/slots

# Verificar logs (aumentar verbosidade)
LLAMA_LOG_VERBOSITY=4 llama-server -m modelo.gguf
```

### Caracteres estranhos ou tokens especiais na saída

```bash
# Desabilitar tokens especiais
llama-cli -m modelo.gguf --no-special -cnv

# Usar template de chat correto
llama-cli -m modelo.gguf --chat-template llama3 -cnv

# Debug de template
llama-debug-template-parser -m modelo.gguf
```

### Modelo não suporta chat / conversação

```bash
# Forçar template de chat
llama-cli -m modelo.gguf --chat-template chatml -cnv

# Usar sem modo conversação (completions puro)
llama-cli -m modelo.gguf --no-conversation -p "Prompt direto aqui"
```

---

## 💡 Dicas Úteis / Receitas

### Servidor local para usar com qualquer cliente OpenAI

```bash
# Iniciar servidor em background
llama-server -hf ggml-org/Qwen2.5-Coder-1.5B-Instruct-GGUF -fa on &

# Usar com curl
curl -s http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Olá!"}]}' | jq .

# Parar servidor
kill %1
```

### Modelos default (download automático)

```bash
# GPT-OSS 20B
llama-cli --gpt-oss-20b-default -cnv

# GPT-OSS 120B
llama-cli --gpt-oss-120b-default -cnv

# Gemma 3 Vision 4B (quantizado)
llama-cli --vision-gemma-4b-default --image foto.jpg -cnv

# Gemma 3 Vision 12B (quantizado)
llama-cli --vision-gemma-12b-default --image foto.jpg -cnv
```

### Completions de código (FIM - Fill in Middle)

```bash
# Servidor com presets de código
llama-server --fim-qwen-7b-spec

# Outros presets disponíveis:
# --fim-qwen-1.5b-default
# --fim-qwen-3b-default
# --fim-qwen-7b-default
# --fim-qwen-14b-spec (com speculative)
# --fim-qwen-30b-default
```

### Benchmark rápido do seu hardware

```bash
# Benchmark com modelo pequeno
llama-bench -hf ggml-org/Qwen2.5-Coder-1.5B-Instruct-GGUF -p 512 -n 128

# Comparar CPU vs GPU
llama-bench -hf ggml-org/Qwen2.5-Coder-1.5B-Instruct-GGUF -ngl 0,99

# Comparar com/sem Flash Attention
llama-bench -hf ggml-org/Qwen2.5-Coder-1.5B-Instruct-GGUF -fa 0,1

# Exportar resultados em JSON
llama-bench -hf ggml-org/Qwen2.5-Coder-1.5B-Instruct-GGUF -o json > bench.json
```

### Tokenizar texto (debug)

```bash
# Ver como o modelo tokeniza um texto
llama-tokenize -m modelo.gguf -p "Olá, mundo!"
```

### Modo offline (sem internet)

```bash
# Forçar uso apenas do cache (sem tentar baixar)
LLAMA_OFFLINE=1 llama-cli -hf usuario/modelo-GGUF -cnv

# Ou via flag
llama-cli --offline -hf usuario/modelo-GGUF -cnv
```

### Salvar e carregar estado de sessão

```bash
# Salvar estado da sessão
llama-save-load-state -m modelo.gguf -p "Contexto longo..." --save-state sessao.bin

# Carregar estado salvo (retoma de onde parou)
llama-save-load-state -m modelo.gguf --load-state sessao.bin -cnv
```

### Bash completion

```bash
# Gerar script de completion
llama-cli --completion-bash >> ~/.zshrc

# Ou salvar em arquivo separado
llama-cli --completion-bash > /opt/homebrew/share/zsh/site-functions/_llama
```

### Perplexidade de um modelo

```bash
# Calcular perplexidade (medir qualidade do modelo)
llama-perplexity -m modelo.gguf -f texto-teste.txt
```

### Rodar com Docker (alternativa)

```bash
# Docker Hub repos integrados
llama-cli -dr gemma3 -cnv

# Especificar quantização
llama-cli -dr ai/qwen2.5:Q4_K_M -cnv
```

---

## 📚 Referência Completa de Binários

```
llama-cli
  Binário principal para chat interativo e geração de texto.
  Compartilha flags comuns com outros binários.

  ----- flags comuns -----
  -h,    --help                         mostra ajuda
  --version                             mostra versão
  -m,    --model FNAME                  caminho do modelo GGUF
  -hf,   --hf-repo USER/MODEL[:QUANT]  modelo do HuggingFace
  -hff,  --hf-file FILE                arquivo HF específico
  -hft,  --hf-token TOKEN              token de acesso HF
  -dr,   --docker-repo REPO/MODEL      modelo do Docker Hub
  -mu,   --model-url URL               URL do modelo
  -p,    --prompt PROMPT                prompt de entrada
  -f,    --file FNAME                  arquivo com prompt
  -n,    --n-predict N                  máx tokens (-1=infinito)
  -c,    --ctx-size N                   tamanho do contexto (0=modelo)
  -t,    --threads N                    threads CPU (-1=auto)
  -tb,   --threads-batch N             threads batch
  -b,    --batch-size N                 batch lógico (2048)
  -ub,   --ubatch-size N               batch físico (512)
  -ngl,  --n-gpu-layers N              camadas GPU (auto)
  -fa,   --flash-attn [on|off|auto]    Flash Attention (auto)
  -sm,   --split-mode {none|layer|row} divisão multi-GPU
  -mg,   --main-gpu INDEX              GPU principal (0)
  -ts,   --tensor-split N0,N1,...      proporção entre GPUs
  -ctk,  --cache-type-k TYPE           tipo KV cache K (f16)
  -ctv,  --cache-type-v TYPE           tipo KV cache V (f16)
  --mlock                               forçar RAM (sem swap)
  --mmap, --no-mmap                    memory-map (habilitado)
  --fit  [on|off]                       auto-ajustar memória (on)
  -np,   --parallel N                   sequências paralelas (1)
  --lora FNAME                          adaptador LoRA
  --lora-scaled FNAME:SCALE            LoRA com escala
  --control-vector FNAME               control vector
  --override-kv KEY=TYPE:VALUE         sobrescrever metadados
  -v,    --verbose                      saída detalhada
  --offline                             modo offline
  --log-file FNAME                     arquivo de log

  ----- flags do cli -----
  -cnv,  --conversation                 modo chat
  -no-cnv, --no-conversation           sem modo chat
  -sys,  --system-prompt PROMPT        system prompt
  -sysf, --system-prompt-file FILE     system prompt de arquivo
  -st,   --single-turn                 apenas uma interação
  -r,    --reverse-prompt PROMPT       para geração neste texto
  -co,   --color [on|off|auto]         colorir saída
  --display-prompt                      exibir prompt
  --context-shift                       shift de contexto
  -mli,  --multiline-input             entrada multilinha
  --show-timings                        mostrar métricas

  ----- flags de reasoning -----
  -rea,  --reasoning [on|off|auto]     raciocínio (auto)
  --reasoning-budget N                  orçamento tokens (-1)
  --reasoning-format FORMAT            formato: none|deepseek

  ----- flags de chat template -----
  --chat-template TEMPLATE              template built-in
  --chat-template-file FILE             template Jinja de arquivo
  --jinja, --no-jinja                  engine Jinja (habilitado)

  ----- flags de sampling -----
  --samplers SAMPLERS                   ordem dos samplers
  --seed N                              seed (-1=aleatório)
  --temp N                              temperatura (0.80)
  --top-k N                             top-K (40)
  --top-p N                             top-P nucleus (0.95)
  --min-p N                             min-P (0.05)
  --repeat-penalty N                    penalidade repetição (1.00)
  --repeat-last-n N                     janela penalidade (64)
  --presence-penalty N                  presença (0.00)
  --frequency-penalty N                 frequência (0.00)
  --mirostat N                          mirostat 0|1|2 (0)
  --grammar GRAMMAR                     grammar BNF
  --grammar-file FILE                   grammar de arquivo
  -j,    --json-schema SCHEMA          forçar JSON schema
  -jf,   --json-schema-file FILE       JSON schema de arquivo

  ----- flags multimodal -----
  -mm,   --mmproj FILE                  projetor multimodal
  --image, --audio FILE                imagem/áudio

  ----- flags speculative -----
  -md,   --model-draft FILE             modelo draft
  --draft N                             tokens draft (16)
  --draft-p-min P                       probabilidade mín. (0.75)

llama-server
  Servidor HTTP com API compatível com OpenAI e Web UI.
  Aceita todas as flags comuns + flags de sampling +

  --host HOST                           host (127.0.0.1)
  --port PORT                           porta (8080)
  -np,   --parallel N                   slots paralelos (-1=auto)
  --api-key KEY                         chave de API
  --api-key-file FILE                   arquivo de chaves
  --webui, --no-webui                  Web UI (habilitado)
  --embedding, --embeddings            endpoint embeddings
  --rerank, --reranking                endpoint reranking
  --metrics                             endpoint Prometheus
  --slots, --no-slots                  endpoint slots
  -to,   --timeout N                    timeout (600s)
  --threads-http N                      threads HTTP
  -cb,   --cont-batching               batching contínuo
  --cache-prompt                        cache prompts
  --cache-reuse N                       reutilizar cache
  -a,    --alias STRING                 alias do modelo
  --path PATH                           servir estáticos
  --ssl-key-file FILE                   chave SSL
  --ssl-cert-file FILE                  certificado SSL
  --models-dir PATH                     diretório modelos
  --models-max N                        máx modelos (4)
  --tools TOOL1,TOOL2,...              ferramentas built-in
  --webui-mcp-proxy                    proxy MCP
  --spec-type TYPE                      speculative s/ draft

llama-quantize
  Quantiza modelos GGUF para menor tamanho.

  uso: llama-quantize [flags] input.gguf [output.gguf] TIPO [nthreads]

  tipos principais: Q4_K_M, Q4_K_S, Q5_K_M, Q5_K_S, Q6_K, Q8_0,
                    Q3_K_M, Q3_K_S, Q2_K, IQ4_XS, IQ3_M, IQ3_XS,
                    IQ2_XS, F16, BF16, F32, COPY

  --allow-requantize                    re-quantizar (⚠️ perde qualidade)
  --leave-output-tensor                 não quantizar output
  --pure                                sem k-quant mixtures
  --imatrix FILE                        importance matrix
  --include-weights TENSOR              aplicar imatrix em tensor
  --exclude-weights TENSOR              excluir tensor da imatrix
  --tensor-type PATTERN=TYPE            tipo por tensor
  --prune-layers L0,L1,...             remover camadas
  --keep-split                          manter shards
  --override-kv KEY=TYPE:VALUE         sobrescrever metadata
  --dry-run                             apenas simular

llama-embedding
  Gera embeddings de texto.

  --pooling {none|mean|cls|last|rank}  tipo de pooling
  --attention {causal|non-causal}      tipo de atenção
  --embd-normalize N                    normalização (2)
  --embd-output-format FMT             formato saída
  --embd-separator STRING              separador (\n)

llama-bench
  Benchmark de performance.

  -m,  --model FILE                     modelo
  -p,  --n-prompt N                     tokens prompt (512)
  -n,  --n-gen N                        tokens geração (128)
  -r,  --repetitions N                  repetições (5)
  -o,  --output FMT                     formato (md)
  --progress                             indicadores de progresso
  --no-warmup                            pular warmup

llama-imatrix
  Gera importance matrix para quantização.

  -m,  --model FILE                     modelo
  -f,  --file FILE                      dados de calibração
  -o,  --output FILE                    arquivo de saída

llama-perplexity
  Calcula perplexidade de modelo.

  -m,  --model FILE                     modelo
  -f,  --file FILE                      texto de teste

llama-tokenize
  Tokeniza texto e mostra tokens.

  -m,  --model FILE                     modelo
  -p,  --prompt TEXT                    texto para tokenizar

llama-gguf
  Inspeciona metadados de arquivos GGUF.

  uso: llama-gguf arquivo.gguf

llama-gguf-split
  Divide ou junta arquivos GGUF.

  --split                                dividir
  --merge                                juntar
  --split-max-size SIZE                 tamanho máx. por parte

llama-gguf-hash
  Calcula hash de arquivos GGUF.

  uso: llama-gguf-hash arquivo.gguf

convert_hf_to_gguf.py
  Converte modelos HuggingFace para GGUF.

  uso: convert_hf_to_gguf.py MODEL_DIR --outfile OUT.gguf --outtype TYPE
```
