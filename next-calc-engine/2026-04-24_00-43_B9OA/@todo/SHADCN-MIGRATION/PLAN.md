# SHADCN-MIGRATION — Plan

## Context

The project has **zero UI component library** — every interactive element (`<button>`, `<input>`, `<select>`, modals, dropdowns, toggles) is hand-rolled with raw HTML + Tailwind CSS v4 utility classes. This covers ~45+ component files across the app.

**What's already compatible:**
- `lucide-react` is installed (shadcn uses this for icons)
- Tailwind CSS v4 is configured with a robust `@theme` design token system (~120 CSS custom properties)
- React 19 + Next.js 16 (shadcn supports both)

**What's missing:**
- No `components.json` (shadcn config)
- No Radix UI primitives
- No `class-variance-authority`, `clsx`, `tailwind-merge`
- No `lib/utils.ts` with `cn()` helper

**Pain points of current approach:**
- No keyboard navigation on custom modals, dropdowns, or menus
- No ARIA roles/attributes on interactive elements (poor accessibility)
- Inconsistent button styling across pages (dozens of ad-hoc Tailwind class combinations)
- Custom Modal component lacks focus trapping and Escape key handling
- Native `<select>` looks different across browsers
- No toast/notification system for action feedback

## Goals

1. Replace all generic UI primitives with shadcn equivalents where a component exists
2. Gain automatic WCAG-compliant accessibility (focus trapping, ARIA, keyboard nav)
3. Centralize design variants (Button, Badge, Card) instead of repeating Tailwind classes
4. Reduce custom UI code volume by ~40-60%
5. Add missing UX capabilities (tooltips, toasts, skeleton loading)
6. Maintain 100% visual fidelity with current brand identity (magenta accent, design tokens)
7. Keep domain-specific builder components (expression editor, token chips, table editor) — they use shadcn primitives internally but stay custom

## Scope

### IN
- All `<button>` elements → shadcn `Button` with project-specific variants
- All `<input>` elements → shadcn `Input`
- All `<label>` elements → shadcn `Label`
- All `<textarea>` elements → shadcn `Textarea`
- All `<select>` elements → shadcn `Select`
- Custom `Modal` component → shadcn `Dialog`
- Confirmation dialogs → shadcn `AlertDialog`
- Hamburger mobile menu → shadcn `Sheet`
- Card patterns (engine cards, project cards, guide cards) → shadcn `Card`
- Overflow menus (`⋮`) → shadcn `DropdownMenu`
- ON/OFF toggle patterns → shadcn `Switch`
- Scrollable containers → shadcn `ScrollArea`
- Status badges ("Publicado", "Ativo", "Rascunho") → shadcn `Badge`
- Section dividers → shadcn `Separator`
- New: icon button hints → shadcn `Tooltip`
- New: action feedback → shadcn `Sonner` (toast)
- New: content loading → shadcn `Skeleton`
- New: collapsible sections → shadcn `Collapsible`

### OUT
- Token-based expression editor (domain-specific, no shadcn equivalent)
- Inline number editing on tokens (domain-specific interaction)
- Drag/reorder arrows for steps/columns/rows (keep custom, possibly wrap with shadcn Button)
- TableEditor column/row management (domain-specific CRUD grid)
- JSON syntax highlighting (CSS-only feature)
- Loading spinner animation (keep custom `animate-spin` or replace with Skeleton where appropriate)
- Login page (Supabase Auth UI — separate concern)

## Decisions

### D1: Tailwind v4 CSS variable strategy
shadcn v2 with Tailwind v4 uses CSS variables in the format `--primary`, `--background`, etc. The project already has `--color-accent`, `--color-bg`, etc. in `@theme`.

**Decision:** Map existing tokens to shadcn's expected variable names during init. Create a mapping layer in `globals.css` that aliases project tokens to shadcn conventions. Keep the existing `@theme` tokens as the source of truth — shadcn variables reference them.

### D2: Incremental migration (not big-bang)
**Decision:** Migrate component-by-component. shadcn components coexist with hand-rolled ones during transition. Each phase is independently deployable.

### D3: Component output directory
**Decision:** Use `components/ui/` (shadcn default) for primitive UI components. Keep domain components in their current locations. This creates a clear separation: `components/ui/` = shadcn primitives, `components/` = domain composites, `app/**/_*` = page-specific.

### D4: Button variant mapping
Current button patterns map to shadcn variants:
- Solid accent (`bg-[var(--color-accent)]`) → `variant="default"` (primary)
- Solid green (`bg-emerald-500`) → `variant="success"` (custom)
- Outline (`border border-[var(--color-border)]`) → `variant="outline"`
- Ghost (no border, hover bg) → `variant="ghost"`
- Destructive (red) → `variant="destructive"`
- Dashed add (`border-dashed`) → `variant="dashed"` (custom)
- Icon-only (small, square) → `size="icon"`
- Small text buttons → `size="sm"`

### D5: Modal → Dialog migration pattern
Current Modal uses: `isOpen` boolean + `onClose` callback + children.
shadcn Dialog uses: `open`/`onOpenChange` + composed children (DialogTrigger, DialogContent, DialogHeader, etc.).

**Decision:** Replace Modal component entirely. Update all ~8 consumers to use Dialog composition pattern. For modals triggered by state (not a trigger button), use `Dialog` with controlled `open` prop.

### D6: Bundle size acceptance
Adding Radix primitives + cva + tailwind-merge adds ~50-80KB gzipped. This is acceptable given the accessibility and DX gains. The project is server-rendered (Next.js) so most of this is client-side only where needed.

## Phases

### Phase 1: Foundation Setup (~1h)
Initialize shadcn/ui, configure CSS variables, create utility helpers.

- Run `npx shadcn@latest init` with Tailwind v4 + Next.js config
- Map design tokens in `globals.css` (alias existing tokens → shadcn convention)
- Verify `lib/utils.ts` with `cn()` helper is created
- Verify existing UI doesn't break after CSS changes
- Install base dependencies (`@radix-ui/react-slot`, `class-variance-authority`, `clsx`, `tailwind-merge`)

### Phase 2: Primitive Components (~3-4h)
Replace the most-used atomic elements across the entire project.

Components to install: `Button`, `Input`, `Label`, `Textarea`, `Badge`, `Separator`

**Button migration** (highest impact — ~20+ files):
- Add custom variants: `success`, `dashed`
- Add custom sizes: map to current patterns
- Files: ALL pages — builder (HeaderToolbar, LeftContent, MainContent, RightContent, modals), calc, engines, projects, guide, PageHeader, NoEnginesState, NoProjectsState

**Input migration** (~10+ files):
- Files: builder (VariablesPanel, ConfigModal, NewEngineModal, TableEditor), calc, engines, projects

**Label migration** (~8+ files):
- Paired with Input replacements

**Textarea migration** (~2 files):
- ImportModal (JSON input), possibly calc

**Badge migration** (~5+ files):
- Engine status badges (Publicado, Ativo, Rascunho)
- Token type chips in expression builder (may stay custom due to color complexity)
- Toggle indicators

**Separator migration** (~5+ files):
- Between sections in sidebars, card lists, etc.

### Phase 3: Modal System (~2-3h)
Complete rewrite of the modal/dialog system.

Components to install: `Dialog`, `AlertDialog`, `Sheet`

**Dialog migration** (replaces `components/Modal/`):
- Rewrite `components/Modal/index.tsx` → delete, replace with shadcn Dialog
- Migrate consumers:
  - `EnginePicker` (engine/project selection modal)
  - `ConfigModal` (engine config)
  - `ImportModal` (JSON import)
  - `NewEngineModal` (create new engine)

**AlertDialog migration** (confirmation dialogs):
- `SaveConfirmModal` → AlertDialog
- `PublishConfirmModal` → AlertDialog
- `ClearConfirmModal` (via useConfirm pattern) → AlertDialog
- Delete confirmation in engines list → AlertDialog
- Delete confirmation in projects list → AlertDialog

**Sheet migration** (mobile menu):
- PageHeader hamburger → Sheet (slide-in from left)

### Phase 4: Composite Components (~2-3h)
Replace composed patterns with shadcn equivalents.

Components to install: `Card`, `Select`, `DropdownMenu`, `ScrollArea`, `Switch`, `Table`

**Card migration** (~3 pages):
- Engine list items → Card
- Project list items → Card
- Guide page sections → Card

**Select migration** (~2 files):
- EnginePicker project dropdown → Select
- Any other native `<select>` usage

**DropdownMenu migration** (~2 pages):
- Engine overflow menu (`⋮`) → DropdownMenu
- Project overflow menu (`⋮`) → DropdownMenu

**ScrollArea migration** (~4 containers):
- Builder left sidebar
- Builder right sidebar
- Any scrollable list containers

**Switch migration** (~3+ toggles):
- Variable output/internal toggle
- Step ON/OFF toggle
- Any other boolean toggles

**Table migration** (evaluate feasibility):
- Calc results display → Table (good fit)
- Builder TableEditor → possibly too custom, evaluate

### Phase 5: UX Enhancements (~1-2h)
Add new capabilities that don't exist today.

Components to install: `Tooltip`, `Sonner`, `Skeleton`, `Collapsible`

**Tooltip** (~10+ icon buttons):
- Delete buttons, edit buttons, reorder arrows, toggle buttons
- Any icon-only button that lacks a text label

**Sonner (toast notifications)**:
- Engine saved/published/activated/deleted feedback
- Project created/updated/deleted feedback
- Error feedback (network errors, validation errors)
- Copy-to-clipboard feedback

**Skeleton**:
- Engine list loading state
- Project list loading state
- Builder initial load
- Replace generic spinner where appropriate

**Collapsible**:
- Builder step sections (expand/collapse formula details)
- Builder variable groups (if applicable)

## Effort Summary

| Phase | Effort | Components | Files Affected |
|---|---|---|---|
| 1. Foundation | ~1h | Setup only | globals.css, lib/utils.ts, package.json |
| 2. Primitives | ~3-4h | Button, Input, Label, Textarea, Badge, Separator | ~25+ files |
| 3. Modal System | ~2-3h | Dialog, AlertDialog, Sheet | ~12 files |
| 4. Composites | ~2-3h | Card, Select, DropdownMenu, ScrollArea, Switch, Table | ~15 files |
| 5. UX Enhancements | ~1-2h | Tooltip, Sonner, Skeleton, Collapsible | ~15+ files |
| **Total** | **~10-13h** | **~18 shadcn components** | **~45+ files** |

## Risks

1. **CSS variable conflict** — existing `@theme` tokens may clash with shadcn defaults. Mitigated by careful mapping in Phase 1.
2. **Visual regression** — button sizing, spacing, colors may shift. Mitigated by incremental migration + visual testing.
3. **Builder complexity** — some builder components are deeply nested with inline styles. May need careful refactoring.
4. **React 19 edge cases** — shadcn/Radix is compatible but some primitives may have minor quirks with React 19 server components.
5. **Tailwind v4 compatibility** — shadcn added v4 support recently; some components may need manual CSS tweaks.
