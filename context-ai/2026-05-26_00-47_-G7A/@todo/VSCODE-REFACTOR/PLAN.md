# VS Code Extension Refactor — Plan

## Context

The VS Code extension (`context-ai-vscode/`) is in early stage (v0.1.0). The core component `ChatViewProvider` is a god class that handles process management, panel parsing, message handling, command handling, and platform detection all in one file. The existing `context-ai-vscode/TODO.md` identified SOLID/DRY violations and proposed a split.

The extension provides a sidebar chat panel that spawns `context-ai chat` as a child process and relays messages between the webview and the CLI.

### Current architecture

```
context-ai-vscode/
├── src/
│   ├── extension.ts          # Entry point — registers ChatViewProvider
│   ├── chatViewProvider.ts   # GOD CLASS — everything in one file
│   └── shared/logger.ts      # Logging utility
├── media/
│   ├── chat.css              # Webview styles
│   └── chat.js               # Webview client-side JS
└── src/webview/
    └── chat-entry.js         # Webview entry (Vite-bundled)
```

### Problems in ChatViewProvider

1. **SRP violation** — handles process spawning, stdout/stderr parsing, webview messaging, command routing, and platform detection
2. **DRY violation** — panel output parsing logic is duplicated/interleaved with process management
3. **No separation of concerns** — business logic mixed with VS Code API calls
4. **Hard to test** — no dependency injection, direct process spawning

## Goals

1. Split `ChatViewProvider` into focused services with single responsibilities
2. Make each service independently testable
3. Maintain current functionality (chat via sidebar panel)
4. Improve error handling and user feedback

## Scope

**In scope:**
- Split `ChatViewProvider` into:
  - `ProcessManager` — spawns and manages `context-ai chat` child process
  - `PanelParser` — parses Rich panel output from stdout into structured data
  - `MessageHandler` — handles webview ↔ extension message protocol
  - `CommandHandler` — routes user commands (send, clear, settings)
  - `PlatformDetector` — OS-specific path/shell detection
- Define TypeScript interfaces for all message types
- Keep `ChatViewProvider` as thin orchestrator that wires services together
- Add shared constants (command names, message types)

**Out of scope:**
- New features (streaming, settings UI, inline suggestions)
- Changing the webview UI (chat.css, chat.js)
- Changing how the CLI is invoked (keep `context-ai chat` subprocess)
- Publishing to VS Code marketplace

## Decisions

- **Services in `src/services/` directory.** Each service is a class with constructor injection.
- **TypeScript interfaces in `src/types/`.** Message types, parsed panel types, process events.
- **Keep webview code as-is.** The refactor is backend-only (extension host side).
- **No test framework yet.** The split makes future testing possible, but adding a test runner (vitest/jest) is a separate effort.

## Target architecture

```
context-ai-vscode/
├── src/
│   ├── extension.ts              # Entry point (unchanged)
│   ├── chatViewProvider.ts       # Thin orchestrator (wires services)
│   ├── services/
│   │   ├── processManager.ts     # Spawn/kill context-ai process
│   │   ├── panelParser.ts        # Parse Rich panel stdout
│   │   ├── messageHandler.ts     # Webview message protocol
│   │   └── commandHandler.ts     # Command routing
│   ├── utils/
│   │   └── platformDetector.ts   # OS detection, path resolution
│   ├── types/
│   │   ├── messages.ts           # Webview ↔ extension message types
│   │   ├── panels.ts             # Parsed panel data types
│   │   └── process.ts            # Process event types
│   ├── constants/
│   │   └── index.ts              # Command names, message types
│   └── shared/
│       └── logger.ts             # Logging (unchanged)
├── media/                        # Unchanged
└── src/webview/                  # Unchanged
```

## Phases

### Phase 1: Extract types and constants (small)
- Create `src/types/messages.ts` — webview message interfaces
- Create `src/types/panels.ts` — parsed panel data interfaces
- Create `src/types/process.ts` — process event interfaces
- Create `src/constants/index.ts` — command names, message type strings

### Phase 2: Extract utilities (small)
- Create `src/utils/platformDetector.ts` — extract OS detection logic from ChatViewProvider

### Phase 3: Extract services (medium)
- Create `src/services/processManager.ts` — extract process spawn/kill/restart logic
- Create `src/services/panelParser.ts` — extract stdout parsing logic
- Create `src/services/messageHandler.ts` — extract webview message handling
- Create `src/services/commandHandler.ts` — extract command routing

### Phase 4: Refactor ChatViewProvider (medium)
- Slim down `chatViewProvider.ts` to thin orchestrator
- Wire all services via constructor injection
- Verify extension still works end-to-end

### Phase 5: Verify (small)
- Test: extension activates without errors
- Test: chat panel opens and connects
- Test: sending a message works
- Test: process cleanup on deactivate
