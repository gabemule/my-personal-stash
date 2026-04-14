# Updating the AI Guidelines

This file serves two purposes:
1. **Reference** — explains what to check and update when the DS changes
2. **Runnable prompt** — paste the prompt at the bottom into Claude Code (in this repo) to trigger an automated review and update of all guideline files

---

## When to update

Update guideline files **in the same PR** that changes the DS. Treat them like changelog entries — if the code changed, the guideline changes too.

| DS change | Guideline file to update |
|---|---|
| New React component added | `./guidelines/ds-react.md` |
| Component props changed (added, removed, renamed) | `./guidelines/ds-react.md` |
| Enum values changed | `./guidelines/ds-react.md` |
| New SASS variable or token | `./guidelines/ds-tokens.md` |
| New function or mixin | `./guidelines/ds-tokens.md` |
| New CSS utility/helper class | `./guidelines/ds-sass.md` |
| Component BEM class name changed | `./guidelines/ds-sass.md` |
| New theme added | `./guidelines/ds-theme.md` + `./CLAUDE.md` |
| Theme colors changed | `./guidelines/ds-theme.md` |
| New DS module (Vue, icons, etc.) | New `./guidelines/ds-<module>.md` + `./.claude/commands/ds-<module>.md` + entry in `./CLAUDE.md` |

---

## Source of truth per guideline file

### `./guidelines/ds-react.md`

**Check these files for changes:**

```
react/src/components/index.tsx                     → component list (additions/removals)
react/src/components/atoms/*/[Name].config.ts      → enums + prop defaults
react/src/components/molecules/*/[Name].config.ts
react/src/components/bosons/*/[Name].config.ts
react/src/components/organisms/*/[Name].config.ts
react/src/components/templates/*/[Name].config.ts
dist/react/main.d.ts                               → authoritative TypeScript interfaces
```

**What to look for:**
- New components in `index.tsx` → add a new entry to the guideline
- Removed components → remove their entry
- New enum value in any `.config.ts` → add to the `Options:` line
- Removed enum value → remove from options
- New prop added to a component → add to the `Optional:` block
- Required prop changed to optional or vice versa → update the `Required:` line
- Default value changed → update `default:` annotation

---

### `./guidelines/ds-tokens.md`

**Check these files for changes:**

```
sass/src/core/tokens/spacings.scss      → $spacing--* and $spacing__inset--* variables
sass/src/core/tokens/typography.scss    → $font__size--* and $font__weight--* variables
sass/src/core/tokens/borders.scss       → $border__radius--* and $border__width--* variables
sass/src/core/tokens/breakpoints.scss   → $breakpoint--* and $grid-breakpoints map
sass/src/core/tokens/opacity.scss       → $opacity--* variables
sass/src/core/tokens/shadows.scss       → $shadow__level--* variables
sass/src/core/functions/                → function signatures and parameters
sass/src/core/mixins/                   → mixin signatures and parameters
```

**What to look for:**
- New variable → add row to the relevant table
- Removed variable → remove from table
- Value change → update the value column
- New function or mixin → add signature + usage example
- Changed function signature → update signature

---

### `./guidelines/ds-sass.md`

**Check these files for changes:**

```
sass/src/core/helpers/colors.scss       → color utility class names and logic
sass/src/core/helpers/display.scss      → flex/display utility classes
sass/src/core/helpers/order.scss        → order utility classes
sass/src/core/helpers/borders.scss      → border color utility classes
sass/src/core/helpers/elevation.scss    → elevation/shadow classes
sass/src/core/atoms/*/                  → component root BEM class names
sass/src/core/molecules/*/
sass/src/core/bosons/*/
```

**What to look for:**
- New utility class → add to the relevant section
- Removed or renamed class → remove/update entry (note if it's a breaking change)
- New component CSS file → add a row to the component BEM class table
- New color shade added to the palette → add to the color class lists

---

### `./guidelines/ds-theme.md`

**Check these files for changes:**

```
sass/src/themes/default/colors.scss     → default theme color hex values
sass/src/themes/aon/colors.scss
sass/src/themes/bees/colors.scss
sass/src/themes/bmc/colors.scss
sass/src/themes/linker/colors.scss
sass/src/themes/oggi/colors.scss
sass/src/themes/streetgo/colors.scss
sass/src/themes/*/typography.scss       → font family names per theme
react/src/components/molecules/ThemeProvider/ThemeProvider.tsx  → props interface
```

**What to look for:**
- New theme directory → add to the theme list table and color palettes section
- Color hex value changed → update the palette table for that theme
- New color token added to a theme → add row to the palette table
- ThemeProvider props changed → update the props block
- Font family changed → update the typography note for that theme

---

### `./CLAUDE.md`

**When to update:** Only when a new `./guidelines/ds-<module>.md` file is added.

Add a new `@./guidelines/ds-<module>.md` import line so consumer projects that use `@ai/CLAUDE.md` automatically get the new module.

---

## Manual update checklist

Use this checklist when making a DS change:

- [ ] Ran `git diff` or reviewed the PR to identify which source files changed
- [ ] Identified which guideline file(s) are affected (see table above)
- [ ] Read the changed source file(s)
- [ ] Updated the relevant guideline file(s) to match
- [ ] If a new module was added: created `./guidelines/ds-<module>.md` + `./.claude/commands/ds-<module>.md` + added `@` import to `./CLAUDE.md`
- [ ] Verified the updated guideline is accurate by asking Claude a question that exercises the change

---

## Automated update — Claude prompt

Copy everything below the horizontal rule and paste it into Claude Code while in this repository root. Claude will read all source files, compare them against the current guideline files, and update whatever is stale.

---

You are maintaining the `ai/guidelines/` files for `@akad/design-system`. Your job is to check the current source files against the existing guideline files and update any guideline that is out of date.

**Step 1 — Read the current guideline files:**
- `ai/guidelines/ds-react.md`
- `ai/guidelines/ds-tokens.md`
- `ai/guidelines/ds-sass.md`
- `ai/guidelines/ds-theme.md`

**Step 2 — Read the source of truth files and compare:**

For `ds-react.md`, read:
- `react/src/components/index.tsx` — check the component list for additions or removals
- Every `react/src/components/*/*/*.config.ts` — check enums and props for changes
- `dist/react/main.d.ts` — verify TypeScript interfaces

For `ds-tokens.md`, read:
- `sass/src/core/tokens/spacings.scss`
- `sass/src/core/tokens/typography.scss`
- `sass/src/core/tokens/borders.scss`
- `sass/src/core/tokens/breakpoints.scss`
- `sass/src/core/tokens/opacity.scss`
- `sass/src/core/tokens/shadows.scss`
- All files in `sass/src/core/functions/`
- All files in `sass/src/core/mixins/`

For `ds-sass.md`, read:
- `sass/src/core/helpers/colors.scss`
- `sass/src/core/helpers/display.scss`
- `sass/src/core/helpers/order.scss`
- `sass/src/core/helpers/borders.scss`
- `sass/src/core/helpers/elevation.scss`

For `ds-theme.md`, read:
- `sass/src/themes/default/colors.scss`
- `sass/src/themes/aon/colors.scss`
- `sass/src/themes/bees/colors.scss`
- `sass/src/themes/bmc/colors.scss`
- `sass/src/themes/linker/colors.scss`
- `sass/src/themes/oggi/colors.scss`
- `sass/src/themes/streetgo/colors.scss`
- `react/src/components/molecules/ThemeProvider/ThemeProvider.tsx`

**Step 3 — For each guideline file, report what is outdated:**

List every discrepancy found:
- Missing components, tokens, classes, or themes
- Removed items still present in the guideline
- Changed values (enum values, defaults, hex colors, px values)
- Changed prop signatures or types

**Step 4 — Update each guideline file that has changes.**

Apply only what is needed — do not rewrite sections that are already accurate.
Preserve the existing format and structure of each file.

After updating, confirm what was changed and in which file.
