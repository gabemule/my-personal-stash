# VS Code Extension Refactor — Progress

**Status:** 0/5 phases · Phase: Not started

## Current Focus
Not started yet.
Next step: Create TypeScript interfaces for message types
Blocker: none

## Progress

### Phase 1: Extract types and constants
- [ ] Create `src/types/messages.ts`
- [ ] Create `src/types/panels.ts`
- [ ] Create `src/types/process.ts`
- [ ] Create `src/constants/index.ts`

### Phase 2: Extract utilities
- [ ] Create `src/utils/platformDetector.ts`

### Phase 3: Extract services
- [ ] Create `src/services/processManager.ts`
- [ ] Create `src/services/panelParser.ts`
- [ ] Create `src/services/messageHandler.ts`
- [ ] Create `src/services/commandHandler.ts`

### Phase 4: Refactor ChatViewProvider
- [ ] Slim down to thin orchestrator
- [ ] Wire services via constructor injection
- [ ] End-to-end verification

### Phase 5: Verify
- [ ] Extension activates without errors
- [ ] Chat panel opens and connects
- [ ] Sending a message works
- [ ] Process cleanup on deactivate

## Decisions Made During Execution
(none yet)
