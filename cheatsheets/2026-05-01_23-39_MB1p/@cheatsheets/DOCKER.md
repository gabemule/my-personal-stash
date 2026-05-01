# 🐳 Docker — Cheat Sheet Completo

> Referência rápida para Docker CLI, Dockerfile, Docker Compose e boas práticas.
> Baseado na documentação oficial: [docs.docker.com](https://docs.docker.com) | Docker v29+

---

## 📋 Índice

- [Tabela Geral de Comandos](#-tabela-geral-de-comandos)
- [Containers — Ciclo de Vida](#-containers--ciclo-de-vida)
- [Containers — Inspeção e Debug](#-containers--inspeção-e-debug)
- [Imagens](#-imagens)
- [Docker Build / Dockerfile](#-docker-build--dockerfile)
- [Docker Compose](#-docker-compose)
- [Volumes](#-volumes)
- [Networks](#-networks)
- [Registry / Docker Hub](#-registry--docker-hub)
- [Limpeza / Prune](#-limpeza--prune)
- [System / Info](#-system--info)
- [Variáveis de Ambiente e Config](#-variáveis-de-ambiente-e-config)
- [Dockerfile Reference](#-dockerfile-reference)
- [docker-compose.yml Reference](#-docker-composeyml-reference)
- [.dockerignore](#-dockerignore)
- [Dicas Úteis / Receitas](#-dicas-úteis--receitas)

---

## 📊 Tabela Geral de Comandos

### Comandos Principais

| Comando | O que faz |
|---|---|
| `docker run` | Cria e executa um container a partir de uma imagem |
| `docker exec` | Executa comando dentro de um container rodando |
| `docker ps` | Lista containers em execução |
| `docker ps -a` | Lista todos os containers (incluindo parados) |
| `docker build` | Constrói uma imagem a partir de um Dockerfile |
| `docker pull` | Baixa uma imagem de um registry |
| `docker push` | Envia uma imagem para um registry |
| `docker images` | Lista imagens locais |
| `docker login` | Autentica em um registry |
| `docker logout` | Faz logout de um registry |
| `docker search` | Busca imagens no Docker Hub |
| `docker version` | Mostra versão do Docker |
| `docker info` | Mostra informações do sistema Docker |

### Gerenciamento de Containers

| Comando | O que faz |
|---|---|
| `docker create` | Cria um container (sem iniciar) |
| `docker start` | Inicia container(s) parado(s) |
| `docker stop` | Para container(s) em execução (graceful) |
| `docker restart` | Reinicia container(s) |
| `docker kill` | Mata container(s) (força encerramento) |
| `docker rm` | Remove container(s) |
| `docker rename` | Renomeia um container |
| `docker pause` | Pausa todos os processos de um container |
| `docker unpause` | Resume processos pausados de um container |
| `docker update` | Atualiza configuração de container(s) |
| `docker wait` | Bloqueia até container(s) pararem, retorna exit code |
| `docker attach` | Conecta stdin/stdout/stderr a um container rodando |
| `docker cp` | Copia arquivos entre container e host |
| `docker diff` | Mostra mudanças no filesystem do container |
| `docker commit` | Cria nova imagem a partir de mudanças em um container |
| `docker export` | Exporta filesystem de container como tar |
| `docker port` | Mostra mapeamento de portas |
| `docker top` | Mostra processos rodando no container |
| `docker stats` | Mostra uso de recursos (CPU, RAM, rede) em tempo real |
| `docker logs` | Mostra logs de um container |
| `docker inspect` | Mostra info detalhada de um container (JSON) |

### Gerenciamento de Imagens

| Comando | O que faz |
|---|---|
| `docker images` / `docker image ls` | Lista imagens locais |
| `docker pull` / `docker image pull` | Baixa uma imagem |
| `docker push` / `docker image push` | Envia uma imagem |
| `docker build` / `docker image build` | Constrói uma imagem |
| `docker tag` / `docker image tag` | Cria tag para uma imagem |
| `docker rmi` / `docker image rm` | Remove imagem(ns) |
| `docker image prune` | Remove imagens não utilizadas |
| `docker history` / `docker image history` | Mostra histórico de camadas da imagem |
| `docker save` / `docker image save` | Salva imagem(ns) como arquivo tar |
| `docker load` / `docker image load` | Carrega imagem de arquivo tar |
| `docker import` / `docker image import` | Importa filesystem de tarball como imagem |
| `docker image inspect` | Mostra info detalhada de uma imagem |

### Volumes

| Comando | O que faz |
|---|---|
| `docker volume create` | Cria um volume |
| `docker volume ls` | Lista volumes |
| `docker volume inspect` | Mostra info de um volume |
| `docker volume rm` | Remove volume(s) |
| `docker volume prune` | Remove volumes não utilizados |

### Networks

| Comando | O que faz |
|---|---|
| `docker network create` | Cria uma rede |
| `docker network ls` | Lista redes |
| `docker network inspect` | Mostra info de uma rede |
| `docker network rm` | Remove rede(s) |
| `docker network prune` | Remove redes não utilizadas |
| `docker network connect` | Conecta container a uma rede |
| `docker network disconnect` | Desconecta container de uma rede |

### Docker Compose

| Comando | O que faz |
|---|---|
| `docker compose up` | Cria e inicia containers |
| `docker compose up -d` | Cria e inicia em background (detached) |
| `docker compose down` | Para e remove containers, redes |
| `docker compose build` | Constrói ou reconstrói serviços |
| `docker compose pull` | Baixa imagens dos serviços |
| `docker compose push` | Envia imagens dos serviços |
| `docker compose start` | Inicia serviços |
| `docker compose stop` | Para serviços |
| `docker compose restart` | Reinicia serviços |
| `docker compose ps` | Lista containers do compose |
| `docker compose ls` | Lista projetos compose rodando |
| `docker compose logs` | Mostra logs dos serviços |
| `docker compose exec` | Executa comando em um serviço |
| `docker compose run` | Executa comando one-off em um serviço |
| `docker compose cp` | Copia arquivos entre serviço e host |
| `docker compose config` | Valida e mostra config do compose |
| `docker compose images` | Lista imagens dos serviços |
| `docker compose top` | Mostra processos dos serviços |
| `docker compose stats` | Mostra uso de recursos em tempo real |
| `docker compose events` | Recebe eventos em tempo real |
| `docker compose scale` | Escala serviços |
| `docker compose kill` | Força parada dos serviços |
| `docker compose rm` | Remove containers parados |
| `docker compose pause` | Pausa serviços |
| `docker compose unpause` | Resume serviços |
| `docker compose watch` | Monitora mudanças e rebuild automático |
| `docker compose wait` | Bloqueia até containers pararem |
| `docker compose version` | Mostra versão do compose |

### Sistema / Limpeza

| Comando | O que faz |
|---|---|
| `docker system df` | Mostra uso de disco do Docker |
| `docker system prune` | Remove tudo não utilizado (containers, redes, imagens) |
| `docker system prune -a` | Remove tudo incluindo imagens sem container |
| `docker system prune --volumes` | Remove tudo incluindo volumes |
| `docker system info` | Info do sistema Docker |
| `docker system events` | Eventos em tempo real |
| `docker container prune` | Remove containers parados |
| `docker image prune` | Remove imagens dangling |
| `docker image prune -a` | Remove todas imagens não utilizadas |
| `docker volume prune` | Remove volumes não utilizados |
| `docker network prune` | Remove redes não utilizadas |

### Management Commands (Avançado)

| Comando | O que faz |
|---|---|
| `docker buildx` | Build avançado (multi-platform, cache, etc.) |
| `docker compose` | Docker Compose (multi-container) |
| `docker context` | Gerencia contextos (múltiplos daemons) |
| `docker manifest` | Gerencia manifests de imagens |
| `docker plugin` | Gerencia plugins |
| `docker scout` | Docker Scout (vulnerabilidades) |
| `docker init` | Cria arquivos Docker iniciais para seu projeto |
| `docker debug` | Shell em qualquer imagem ou container |

---

## 📦 Containers — Ciclo de Vida

### docker run (o mais importante)

```bash
docker run [OPTIONS] IMAGE [COMMAND] [ARG...]
```

#### Flags mais usadas

| Flag | O que faz | Exemplo |
|---|---|---|
| `-d` | Detached (background) | `docker run -d nginx` |
| `-it` | Interativo + TTY (terminal) | `docker run -it ubuntu bash` |
| `--name` | Nome do container | `docker run --name meu-app nginx` |
| `-p` | Mapeia porta host:container | `docker run -p 8080:80 nginx` |
| `-P` | Mapeia todas as portas expostas aleatoriamente | `docker run -P nginx` |
| `-v` | Monta volume | `docker run -v /host:/container nginx` |
| `--mount` | Monta volume (sintaxe mais explícita) | `docker run --mount type=bind,src=.,dst=/app nginx` |
| `-e` | Define variável de ambiente | `docker run -e NODE_ENV=prod node` |
| `--env-file` | Carrega variáveis de arquivo | `docker run --env-file .env node` |
| `-w` | Define diretório de trabalho | `docker run -w /app node npm start` |
| `--rm` | Remove container ao parar | `docker run --rm alpine echo hi` |
| `--restart` | Política de restart | `docker run --restart=unless-stopped nginx` |
| `--network` | Conecta a uma rede | `docker run --network=minha-rede nginx` |
| `--hostname` | Define hostname do container | `docker run --hostname=app nginx` |
| `--cpus` | Limita CPUs | `docker run --cpus=2 nginx` |
| `-m` / `--memory` | Limita memória | `docker run -m 512m nginx` |
| `--platform` | Especifica plataforma | `docker run --platform=linux/amd64 nginx` |
| `--user` | Define usuário | `docker run --user=1000:1000 nginx` |
| `--privileged` | Modo privilegiado (acesso total) | `docker run --privileged ubuntu` |
| `--read-only` | Filesystem read-only | `docker run --read-only nginx` |
| `--entrypoint` | Sobrescreve entrypoint | `docker run --entrypoint sh nginx` |
| `--label` | Adiciona metadata | `docker run --label env=prod nginx` |
| `--log-driver` | Define driver de log | `docker run --log-driver=json-file nginx` |
| `--add-host` | Adiciona entrada no /etc/hosts | `docker run --add-host=db:10.0.0.1 nginx` |
| `--pid` | Namespace de PID | `docker run --pid=host nginx` |
| `--init` | Usa init process (tini) | `docker run --init node` |
| `--gpus` | Acesso a GPUs | `docker run --gpus all nvidia/cuda` |

#### Exemplos comuns

```bash
# Container simples em background
docker run -d --name web -p 8080:80 nginx

# Container interativo (entra no shell)
docker run -it --rm ubuntu bash

# Container com variáveis e volume
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=mydb \
  -v pgdata:/var/lib/postgresql/data \
  -p 5432:5432 \
  postgres:16

# Container Node.js com código local
docker run -d \
  --name app \
  -v $(pwd):/app \
  -w /app \
  -p 3000:3000 \
  node:20 npm start

# Container com restart automático
docker run -d --restart=unless-stopped --name web nginx

# Container com limite de recursos
docker run -d --cpus=1 -m 256m --name limitado nginx
```

#### Políticas de restart

| Valor | Comportamento |
|---|---|
| `no` | Nunca reinicia (padrão) |
| `on-failure[:max-retries]` | Reinicia se exit code != 0 |
| `always` | Sempre reinicia |
| `unless-stopped` | Sempre reinicia, exceto se parado manualmente |

### Outros comandos de ciclo de vida

```bash
# Criar sem iniciar
docker create --name meu-app nginx

# Iniciar container(s)
docker start meu-app
docker start app1 app2 app3

# Parar container(s) — graceful (SIGTERM, depois SIGKILL após timeout)
docker stop meu-app
docker stop -t 30 meu-app          # timeout de 30s antes de SIGKILL

# Reiniciar
docker restart meu-app

# Matar (SIGKILL imediato)
docker kill meu-app
docker kill -s SIGUSR1 meu-app     # sinal específico

# Pausar/resumir
docker pause meu-app
docker unpause meu-app

# Remover container(s)
docker rm meu-app
docker rm -f meu-app               # força remoção (mesmo rodando)
docker rm $(docker ps -aq)         # remove TODOS os containers

# Executar comando em container rodando
docker exec meu-app ls /app
docker exec -it meu-app bash       # shell interativo
docker exec -it meu-app sh         # se não tiver bash
docker exec -e VAR=val meu-app cmd # com variável de ambiente
docker exec -u root meu-app cmd    # como root
docker exec -w /app meu-app cmd    # em diretório específico

# Copiar arquivos
docker cp meu-app:/app/log.txt ./log.txt    # container → host
docker cp ./config.yml meu-app:/app/        # host → container
```

---

## 🔍 Containers — Inspeção e Debug

```bash
# Listar containers rodando
docker ps

# Listar TODOS (incluindo parados)
docker ps -a

# Listar com formato customizado
docker ps --format "table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}"

# Listar só IDs
docker ps -q
docker ps -aq                       # todos, só IDs

# Filtrar containers
docker ps -f status=exited
docker ps -f name=web
docker ps -f label=env=prod

# Ver logs
docker logs meu-app
docker logs -f meu-app              # follow (tempo real)
docker logs --tail 100 meu-app      # últimas 100 linhas
docker logs --since 1h meu-app      # última hora
docker logs --timestamps meu-app    # com timestamps
docker logs -f --since 5m meu-app   # follow últimos 5 min

# Inspecionar container (JSON completo)
docker inspect meu-app
docker inspect -f '{{.State.Status}}' meu-app
docker inspect -f '{{.NetworkSettings.IPAddress}}' meu-app
docker inspect -f '{{json .Config.Env}}' meu-app | jq

# Uso de recursos em tempo real
docker stats
docker stats meu-app
docker stats --no-stream             # snapshot único
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Processos rodando no container
docker top meu-app

# Mudanças no filesystem
docker diff meu-app

# Portas mapeadas
docker port meu-app

# Shell de debug (Docker Debug)
docker debug meu-app                 # abre shell com ferramentas de debug
```

---

## 🖼️ Imagens

```bash
# Listar imagens locais
docker images
docker images -a                     # incluindo intermediárias
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

# Baixar imagem
docker pull nginx
docker pull nginx:1.25
docker pull nginx:alpine
docker pull --platform linux/amd64 nginx

# Buscar no Docker Hub
docker search nginx
docker search --filter stars=100 nginx

# Criar tag
docker tag nginx:latest meu-registry/nginx:v1

# Remover imagem
docker rmi nginx
docker rmi -f nginx                  # força
docker rmi $(docker images -q)      # remove TODAS

# Histórico de camadas
docker history nginx
docker history --no-trunc nginx

# Salvar/carregar imagem (offline)
docker save nginx > nginx.tar
docker save nginx:latest -o nginx.tar
docker load < nginx.tar
docker load -i nginx.tar

# Exportar/importar container como imagem
docker export meu-app > app.tar
docker import app.tar minha-imagem:latest

# Criar imagem de container modificado
docker commit meu-app minha-imagem:v1
docker commit -m "adicionou config" meu-app minha-imagem:v2

# Inspecionar imagem
docker image inspect nginx
docker image inspect -f '{{.Config.ExposedPorts}}' nginx
```

---

## 🏗️ Docker Build / Dockerfile

### docker build

```bash
# Build básico (Dockerfile no diretório atual)
docker build -t minha-app .

# Build com tag específica
docker build -t minha-app:v1.0 .

# Build com Dockerfile em outro local
docker build -f docker/Dockerfile.prod -t minha-app .

# Build com argumentos
docker build --build-arg NODE_ENV=production -t app .

# Build sem cache
docker build --no-cache -t app .

# Build com target (multi-stage)
docker build --target builder -t app-builder .

# Build multi-platform (buildx)
docker buildx build --platform linux/amd64,linux/arm64 -t app .

# Build e push em um comando
docker buildx build --platform linux/amd64 -t user/app:latest --push .
```

---

## 🐙 Docker Compose

### Comandos principais

```bash
# Iniciar serviços (foreground)
docker compose up

# Iniciar em background
docker compose up -d

# Iniciar e forçar rebuild
docker compose up -d --build

# Iniciar serviço específico
docker compose up -d postgres

# Parar e remover tudo
docker compose down

# Parar, remover + volumes
docker compose down -v

# Parar, remover + imagens
docker compose down --rmi all

# Rebuild
docker compose build
docker compose build --no-cache
docker compose build app             # serviço específico

# Logs
docker compose logs
docker compose logs -f               # follow
docker compose logs -f app           # serviço específico
docker compose logs --tail 50 app

# Status
docker compose ps
docker compose ps -a                 # incluindo parados
docker compose ls                    # listar projetos

# Exec em serviço
docker compose exec app bash
docker compose exec -T app cmd       # sem TTY (para scripts)
docker compose exec db psql -U postgres

# Run one-off
docker compose run --rm app npm test
docker compose run --rm app sh

# Escalar
docker compose up -d --scale worker=3

# Watch (rebuild automático)
docker compose watch

# Pull/push imagens
docker compose pull
docker compose push

# Validar compose file
docker compose config

# Parar sem remover
docker compose stop
docker compose start

# Restart
docker compose restart
docker compose restart app

# Copiar arquivos
docker compose cp app:/app/file.txt ./file.txt
```

### Opções globais do compose

| Opção | O que faz |
|---|---|
| `-f arquivo.yml` | Especifica arquivo compose |
| `-p nome` | Nome do projeto |
| `--env-file .env.prod` | Arquivo de variáveis alternativo |
| `--profile dev` | Ativa profile específico |
| `--dry-run` | Simula execução sem fazer nada |
| `--parallel N` | Controla paralelismo (-1 = ilimitado) |

```bash
# Usar arquivo específico
docker compose -f docker-compose.prod.yml up -d

# Múltiplos arquivos (merge)
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d

# Projeto com nome
docker compose -p meu-projeto up -d

# Com profile
docker compose --profile dev up -d
```

---

## 💾 Volumes

### Tipos de volumes

| Tipo | Sintaxe | Uso |
|---|---|---|
| **Named volume** | `-v meu-vol:/data` | Dados persistentes gerenciados pelo Docker |
| **Bind mount** | `-v /host/path:/container/path` | Mapeia diretório do host |
| **tmpfs** | `--tmpfs /tmp` | Em memória, não persiste |

### Comandos

```bash
# Criar volume
docker volume create meu-dados

# Listar volumes
docker volume ls

# Inspecionar
docker volume inspect meu-dados

# Remover
docker volume rm meu-dados

# Remover não utilizados
docker volume prune

# Usar named volume
docker run -d -v meu-dados:/var/lib/data postgres

# Bind mount (diretório local)
docker run -d -v $(pwd)/html:/usr/share/nginx/html nginx

# Bind mount read-only
docker run -d -v $(pwd)/config:/etc/app:ro nginx

# tmpfs (em memória)
docker run -d --tmpfs /tmp:rw,size=100m nginx

# Sintaxe --mount (mais explícita)
docker run -d \
  --mount type=volume,src=meu-dados,dst=/data \
  postgres

docker run -d \
  --mount type=bind,src=$(pwd)/html,dst=/usr/share/nginx/html,readonly \
  nginx
```

### Backup e restore de volumes

```bash
# Backup de volume para tar
docker run --rm -v meu-dados:/data -v $(pwd):/backup alpine \
  tar czf /backup/meu-dados-backup.tar.gz -C /data .

# Restore de tar para volume
docker run --rm -v meu-dados:/data -v $(pwd):/backup alpine \
  tar xzf /backup/meu-dados-backup.tar.gz -C /data
```

---

## 🌐 Networks

### Drivers de rede

| Driver | Descrição |
|---|---|
| `bridge` | Rede padrão. Containers se comunicam na mesma rede. |
| `host` | Container usa a rede do host diretamente |
| `none` | Sem rede |
| `overlay` | Rede entre múltiplos Docker hosts (Swarm) |
| `macvlan` | Atribui MAC address ao container |

### Comandos

```bash
# Criar rede
docker network create minha-rede

# Criar com driver específico
docker network create --driver bridge --subnet 172.20.0.0/16 minha-rede

# Listar redes
docker network ls

# Inspecionar
docker network inspect minha-rede

# Conectar container a rede
docker network connect minha-rede meu-app

# Desconectar
docker network disconnect minha-rede meu-app

# Remover
docker network rm minha-rede

# Remover não utilizadas
docker network prune

# Rodar container em rede específica
docker run -d --network=minha-rede --name app nginx
docker run -d --network=minha-rede --name db postgres

# Containers na mesma rede se encontram pelo nome
docker exec app ping db              # funciona!

# Container sem rede
docker run -d --network=none alpine

# Container com rede do host
docker run -d --network=host nginx
```

---

## 🔐 Registry / Docker Hub

```bash
# Login
docker login
docker login registry.example.com
docker login -u usuario -p senha

# Logout
docker logout
docker logout registry.example.com

# Tag para registry
docker tag minha-app:latest usuario/minha-app:v1.0
docker tag minha-app:latest registry.example.com/minha-app:v1.0

# Push
docker push usuario/minha-app:v1.0
docker push registry.example.com/minha-app:v1.0

# Pull
docker pull usuario/minha-app:v1.0

# Buscar no Hub
docker search nginx
docker search --filter is-official=true nginx
docker search --limit 5 postgres
```

---

## 🧹 Limpeza / Prune

```bash
# ⚡ NUCLEAR: remove TUDO não utilizado (containers, networks, imagens, build cache)
docker system prune

# Nuclear + volumes
docker system prune -a --volumes

# Ver uso de disco
docker system df
docker system df -v                  # verbose

# Remover containers parados
docker container prune

# Remover imagens dangling (sem tag)
docker image prune

# Remover TODAS imagens sem container
docker image prune -a

# Remover volumes órfãos
docker volume prune

# Remover redes não utilizadas
docker network prune

# Remover build cache
docker builder prune
docker builder prune -a              # todo o cache

# Combinações manuais
docker rm $(docker ps -aq)                      # todos containers
docker rmi $(docker images -q)                  # todas imagens
docker rm $(docker ps -aq -f status=exited)     # containers parados
docker rmi $(docker images -f dangling=true -q) # imagens dangling
```

---

## ℹ️ System / Info

```bash
# Versão
docker version
docker --version

# Info do sistema
docker info

# Uso de disco
docker system df
docker system df -v

# Eventos em tempo real
docker events
docker events --filter container=meu-app
docker events --filter event=start
docker events --since 1h
```

---

## 🔑 Variáveis de Ambiente e Config

### Variáveis de ambiente do Docker

| Variável | O que faz |
|---|---|
| `DOCKER_HOST` | Daemon socket (ex: `tcp://remote:2375`) |
| `DOCKER_TLS_VERIFY` | Ativa verificação TLS |
| `DOCKER_CERT_PATH` | Caminho para certificados TLS |
| `DOCKER_CONFIG` | Diretório de config (default: `~/.docker`) |
| `DOCKER_CONTEXT` | Contexto padrão |
| `DOCKER_BUILDKIT` | Ativa BuildKit (`1` = ativado) |
| `DOCKER_DEFAULT_PLATFORM` | Plataforma padrão para pull/build |
| `COMPOSE_FILE` | Caminho do compose file |
| `COMPOSE_PROJECT_NAME` | Nome do projeto compose |
| `COMPOSE_PROFILES` | Profiles ativos (separados por vírgula) |
| `COMPOSE_ENV_FILE` | Arquivo de variáveis do compose |

### Caminhos dos arquivos (macOS)

| O que | Caminho |
|---|---|
| Config do Docker | `~/.docker/` |
| Config file | `~/.docker/config.json` |
| Docker Desktop data | `~/Library/Containers/com.docker.docker/` |
| Docker Desktop settings | `~/Library/Group Containers/group.com.docker/` |

### Contextos

```bash
# Listar contextos
docker context ls

# Criar contexto remoto
docker context create remote --docker "host=ssh://user@server"

# Usar contexto
docker context use remote

# Voltar para default
docker context use default
```

---

## 📄 Dockerfile Reference

### Instruções

| Instrução | O que faz |
|---|---|
| `FROM` | Define imagem base |
| `RUN` | Executa comando durante o build |
| `CMD` | Comando padrão ao iniciar container |
| `ENTRYPOINT` | Define executável do container |
| `COPY` | Copia arquivos do host para imagem |
| `ADD` | Copia arquivos (suporta URL e tar auto-extract) |
| `WORKDIR` | Define diretório de trabalho |
| `ENV` | Define variável de ambiente |
| `ARG` | Define argumento de build |
| `EXPOSE` | Documenta porta(s) que o container escuta |
| `VOLUME` | Define ponto de montagem de volume |
| `USER` | Define usuário para RUN, CMD, ENTRYPOINT |
| `LABEL` | Adiciona metadata à imagem |
| `HEALTHCHECK` | Define comando de health check |
| `SHELL` | Muda shell padrão |
| `STOPSIGNAL` | Define sinal de parada do container |
| `ONBUILD` | Instrução executada quando usada como base |

### Exemplo completo (Node.js com multi-stage)

```dockerfile
# ============ Stage 1: Build ============
FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependências primeiro (cache layer)
COPY package.json package-lock.json ./
RUN npm ci

# Copia source e builda
COPY . .
RUN npm run build

# ============ Stage 2: Production ============
FROM node:20-alpine AS production

# Metadata
LABEL maintainer="barney@example.com"
LABEL version="1.0"

# Cria usuário não-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copia só o necessário do stage de build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=3000

# Expõe porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Troca para usuário não-root
USER appuser

# Comando de inicialização
CMD ["node", "dist/server.js"]
```

### CMD vs ENTRYPOINT

| | `CMD` | `ENTRYPOINT` |
|---|---|---|
| **Propósito** | Argumentos padrão | Executável fixo |
| **Sobrescrito por** | `docker run <image> <command>` | `docker run --entrypoint` |
| **Formato exec** | `CMD ["node", "app.js"]` | `ENTRYPOINT ["node", "app.js"]` |
| **Formato shell** | `CMD node app.js` | `ENTRYPOINT node app.js` |

**Combinação recomendada:**
```dockerfile
ENTRYPOINT ["node"]
CMD ["app.js"]
# docker run app → node app.js
# docker run app server.js → node server.js
```

### COPY vs ADD

| | `COPY` | `ADD` |
|---|---|---|
| Copia arquivos | ✅ | ✅ |
| Suporta URL | ❌ | ✅ |
| Auto-extract tar | ❌ | ✅ |
| **Recomendado** | ✅ (na maioria dos casos) | Só quando precisa de URL ou tar |

### Boas práticas do Dockerfile

```dockerfile
# ✅ Use imagens Alpine (menores)
FROM node:20-alpine

# ✅ Crie usuário não-root
RUN adduser -D appuser
USER appuser

# ✅ Copie package.json antes do source (melhor cache)
COPY package.json package-lock.json ./
RUN npm ci --only=production
COPY . .

# ✅ Use multi-stage builds
FROM node:20 AS builder
# ... build
FROM node:20-alpine AS production
COPY --from=builder /app/dist ./dist

# ✅ Use .dockerignore

# ✅ Combine RUN commands (menos layers)
RUN apt-get update && \
    apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/*

# ✅ Use HEALTHCHECK
HEALTHCHECK CMD curl -f http://localhost:3000/ || exit 1
```

---

## 📝 docker-compose.yml Reference

### Exemplo completo

```yaml
# docker-compose.yml
version: "3.9"  # opcional no Compose V2

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
      args:
        NODE_ENV: production
    image: minha-app:latest
    container_name: minha-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://user:pass@db:5432/mydb
    env_file:
      - .env
    volumes:
      - ./uploads:/app/uploads
      - app-logs:/app/logs
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - backend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
        reservations:
          cpus: "0.5"
          memory: 256M
    labels:
      - "app.env=production"
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    profiles:
      - prod

  db:
    image: postgres:16-alpine
    container_name: postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: mydb
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - backend
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d mydb"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - backend
    command: redis-server --appendonly yes

  nginx:
    image: nginx:alpine
    container_name: nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
    depends_on:
      - app
    networks:
      - backend

volumes:
  pgdata:
    driver: local
  redis-data:
  app-logs:

networks:
  backend:
    driver: bridge
```

### Chaves principais do service

| Chave | Descrição |
|---|---|
| `image` | Imagem a usar |
| `build` | Config de build (context, dockerfile, args, target) |
| `container_name` | Nome do container |
| `restart` | Política de restart (`no`, `always`, `on-failure`, `unless-stopped`) |
| `ports` | Mapeamento de portas (`"host:container"`) |
| `expose` | Portas expostas apenas internamente |
| `environment` | Variáveis de ambiente |
| `env_file` | Arquivo(s) de variáveis |
| `volumes` | Montagem de volumes |
| `networks` | Redes do serviço |
| `depends_on` | Dependências (ordem de inicio) |
| `command` | Sobrescreve CMD |
| `entrypoint` | Sobrescreve ENTRYPOINT |
| `working_dir` | Diretório de trabalho |
| `user` | Usuário |
| `healthcheck` | Config de health check |
| `deploy` | Config de deploy (limites, replicas) |
| `logging` | Config de logging |
| `labels` | Metadata |
| `profiles` | Profiles (ativa/desativa serviços) |
| `platform` | Plataforma (ex: `linux/amd64`) |
| `stdin_open` | Equivalente a `-i` |
| `tty` | Equivalente a `-t` |
| `privileged` | Modo privilegiado |
| `read_only` | Filesystem read-only |
| `extra_hosts` | Entradas no /etc/hosts |
| `dns` | Servidores DNS customizados |
| `tmpfs` | Montagem tmpfs |
| `stop_grace_period` | Tempo antes de SIGKILL (default: 10s) |
| `init` | Usa init process |

---

## 🚫 .dockerignore

Crie um `.dockerignore` na raiz do projeto para excluir arquivos do build context:

```
# Dependências
node_modules
vendor
.venv

# Build
dist
build
out

# Git
.git
.gitignore

# Docker
Dockerfile*
docker-compose*
.dockerignore

# IDE
.vscode
.idea
*.swp

# OS
.DS_Store
Thumbs.db

# Env e secrets
.env
.env.*
*.pem
*.key

# Testes e docs
tests
test
__tests__
coverage
docs
README.md
CHANGELOG.md

# Logs
*.log
logs
```

---

## 💡 Dicas Úteis / Receitas

### Entrar em um container rodando

```bash
docker exec -it meu-app bash
docker exec -it meu-app sh          # se não tiver bash
docker compose exec app bash
```

### Rodar comando one-off

```bash
docker run --rm -it node:20 node -e "console.log(process.version)"
docker compose run --rm app npm test
```

### Ver o que tá consumindo espaço

```bash
docker system df
docker system df -v
```

### Seguir logs de vários containers

```bash
docker compose logs -f
docker compose logs -f app db       # serviços específicos
```

### Copiar arquivo de container para host

```bash
docker cp container:/path/file.txt ./file.txt
docker compose cp app:/app/file.txt ./
```

### Inspecionar variáveis de ambiente de um container

```bash
docker inspect -f '{{json .Config.Env}}' meu-app | jq
docker exec meu-app env
```

### Rebuild de imagem + restart no compose

```bash
docker compose up -d --build app
```

### Forçar recreate de containers

```bash
docker compose up -d --force-recreate
```

### Ver IP de um container

```bash
docker inspect -f '{{.NetworkSettings.IPAddress}}' meu-app
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' meu-app
```

### Exportar/importar imagem (transferir offline)

```bash
# No host A
docker save minha-app:latest | gzip > minha-app.tar.gz

# No host B
docker load < minha-app.tar.gz
```

### Limpar tudo e começar do zero

```bash
docker system prune -a --volumes -f
```

### Multi-platform build

```bash
# Criar builder multi-platform
docker buildx create --name mybuilder --use

# Build para múltiplas plataformas
docker buildx build --platform linux/amd64,linux/arm64 -t user/app:latest --push .
```

### Docker init (gera Dockerfile automaticamente)

```bash
cd meu-projeto
docker init
```

Gera `Dockerfile`, `docker-compose.yml`, e `.dockerignore` baseado no seu projeto.

### Docker Debug

```bash
# Shell em container rodando (com ferramentas extras)
docker debug meu-app

# Shell em imagem (sem precisar rodar)
docker debug nginx
```

### Docker Scout (vulnerabilidades)

```bash
docker scout quickview nginx
docker scout cves nginx
docker scout recommendations nginx
```

---

## 📚 Links Úteis

- 📖 [Docs oficiais](https://docs.docker.com)
- 🐙 [Docker Hub](https://hub.docker.com)
- 📦 [Dockerfile Reference](https://docs.docker.com/reference/dockerfile/)
- 🐙 [Compose Reference](https://docs.docker.com/compose/compose-file/)
- 🔧 [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- 💬 [Docker Community](https://forums.docker.com)

---

*Última atualização: Dezembro 2026 — Docker v29+ | Compose V2*
