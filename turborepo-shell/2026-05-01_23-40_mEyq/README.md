# Turborepo Shell - MFE Portal Architecture

> Documentação da arquitetura de Microfrontends usando Turborepo com git submodules

## 📋 Visão Geral

Este projeto documenta a arquitetura de um portal de Microfrontends (MFE) usando Turborepo, projetado para:

- **Unificar múltiplas aplicações independentes** em um único portal
- **Manter builds separados** para resiliência e autonomia de times
- **Compartilhar bibliotecas** entre aplicações via workspace do monorepo
- **Suportar modo standalone** para cada aplicação rodar independentemente
- **Gerenciar autenticação** cross-subdomain de forma unificada

## 🏗️ Arquitetura

```
turborepo-shell/
├── apps/                              # Aplicações (MFEs + Portal Shell)
│   ├── portal/                        # App shell principal (git submodule)
│   ├── calc-engine/                   # MFE calculadora (git submodule)
│   ├── dashboard/                     # MFE dashboard (git submodule)
│   └── settings/                      # MFE settings (git submodule)
├── packages/                          # Bibliotecas compartilhadas
│   ├── shared-auth/                   # Auth package (git submodule)
│   ├── design-system/                 # Design system (git submodule)
│   ├── design-blocks/                 # Components (git submodule)
│   └── sdk/                           # SDK/utils (git submodule)
├── turbo.json                         # Configuração do Turborepo
├── package.json                       # Root package.json com workspaces
├── pnpm-workspace.yaml                # Workspaces do pnpm
└── microfrontends.json                # Configuração de roteamento MFE
```

## 🚀 Stack Tecnológica

- **Monorepo**: Turborepo
- **Package Manager**: pnpm
- **Framework**: Next.js ou React SPA (Vite)
- **State Management**: Zustand
- **MFE Routing**: Turborepo built-in proxy
- **Version Control**: Git com submodules

## 📚 Documentação

1. **[Architecture](docs/01-architecture.md)** - Estrutura do monorepo, submodules, e pnpm
2. **[Routing](docs/02-routing.md)** - Configuração de roteamento entre MFEs
3. **[Shared Auth](docs/03-shared-auth.md)** - Sistema de autenticação unificado
4. **[Shared Libraries](docs/04-shared-libraries.md)** - Gestão de dependências compartilhadas
5. **[Environment Variables](docs/05-environment-variables.md)** - Estratégia de env vars
6. **[Developer Guide](docs/06-developer-guide.md)** - Guia prático para desenvolvedores

## 🎯 Casos de Uso

### Development (Turborepo)
- Todas as aplicações rodam em **localhost:3024** via proxy integrado
- Hot Module Reload (HMR) funciona em todas as apps
- Estado e autenticação compartilhados via localStorage

### Production (Portal Unificado)
- Todas as aplicações servidas em **portal.domain.com** via reverse proxy
- Roteamento por path (`/calc`, `/dashboard`, etc.)
- Auth compartilhado via cookie em `.domain.com`

### Standalone
- Cada aplicação pode rodar em seu próprio subdomínio (`calc.domain.com`)
- Exchange tokens para compartilhar autenticação
- Libs versionadas via npm packages publicados

## 🔗 Links Úteis

- [Turborepo Docs](https://turbo.build/repo/docs)
- [Turborepo Microfrontends Guide](https://turborepo.dev/docs/guides/microfrontends)
- [pnpm Workspaces](https://pnpm.io/workspaces)

## 👥 Contribuindo

Veja o [Developer Guide](docs/05-developer-guide.md) para instruções de setup e desenvolvimento.

---

**Última atualização**: Março 2026
