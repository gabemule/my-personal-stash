# SHADCN-MIGRATION — Progress

**Status:** 0/42 items · Phase: Not started

## Current Focus
Not started — awaiting execution.
Next step: Phase 1 — run `npx shadcn@latest init` and configure CSS variable mapping
Blocker: none

## Progress

### Phase 1: Foundation Setup (0/5)
- [ ] Run `npx shadcn@latest init` (Tailwind v4 + Next.js)
- [ ] Map existing design tokens → shadcn CSS variable convention in `globals.css`
- [ ] Verify `lib/utils.ts` with `cn()` helper is created
- [ ] Verify existing UI doesn't visually break after CSS changes
- [ ] Confirm base dependencies installed (cva, clsx, tailwind-merge, @radix-ui/react-slot)

### Phase 2: Primitive Components (0/12)
- [ ] Install shadcn `Button` component
- [ ] Add custom variants (success, dashed) and sizes to Button
- [ ] Migrate all `<button>` elements to `<Button>` across ~20+ files
- [ ] Install shadcn `Input` component
- [ ] Migrate all `<input>` elements to `<Input>` across ~10+ files
- [ ] Install shadcn `Label` component
- [ ] Migrate all `<label>` elements to `<Label>` across ~8+ files
- [ ] Install shadcn `Textarea` component
- [ ] Migrate `<textarea>` elements (ImportModal, etc.)
- [ ] Install shadcn `Badge` component
- [ ] Migrate status badges (engine status, toggle indicators)
- [ ] Install and migrate shadcn `Separator` across section dividers

### Phase 3: Modal System (0/9)
- [ ] Install shadcn `Dialog` component
- [ ] Delete `components/Modal/index.tsx` and replace with Dialog pattern
- [ ] Migrate `EnginePicker` modal to Dialog
- [ ] Migrate `ConfigModal` to Dialog
- [ ] Migrate `ImportModal` to Dialog
- [ ] Migrate `NewEngineModal` to Dialog
- [ ] Install shadcn `AlertDialog` component
- [ ] Migrate all confirmation dialogs (Save, Publish, Clear, Delete engine, Delete project) to AlertDialog
- [ ] Install shadcn `Sheet` and migrate PageHeader hamburger menu

### Phase 4: Composite Components (0/10)
- [ ] Install shadcn `Card` component
- [ ] Migrate engine list items to Card
- [ ] Migrate project list items to Card
- [ ] Migrate guide page sections to Card
- [ ] Install shadcn `Select` and migrate native `<select>` elements
- [ ] Install shadcn `DropdownMenu` and migrate overflow menus (engines, projects)
- [ ] Install shadcn `ScrollArea` and migrate scrollable containers (builder sidebars)
- [ ] Install shadcn `Switch` and migrate boolean toggles (output/internal, ON/OFF)
- [ ] Install shadcn `Table` component
- [ ] Evaluate and migrate table patterns (calc results display, builder TableEditor feasibility)

### Phase 5: UX Enhancements (0/6)
- [ ] Install shadcn `Tooltip` and add to icon-only buttons (~10+ buttons)
- [ ] Install `Sonner` and add toast notifications for CRUD action feedback
- [ ] Add `<Toaster />` to root layout
- [ ] Install shadcn `Skeleton` and improve loading states (engine list, project list, builder)
- [ ] Install shadcn `Collapsible` and add to builder step sections
- [ ] Final visual QA pass — verify all pages render correctly

## Decisions Made During Execution
(none yet)
