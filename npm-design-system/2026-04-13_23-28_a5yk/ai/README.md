# AI Guidelines & Skills — @akad/design-system

This folder gives **Claude Code** accurate, always-current knowledge of the design system so it can generate correct component usage, look up tokens, scaffold UIs, and review code — without developers pasting documentation manually.

---

## Folder structure

```
ai/
├── README.md                    # This file
├── CLAUDE.md                    # Entry point: @imports all guidelines below
├── guidelines/
│   ├── ds-react.md              # All 37 React components: import, props, enums, examples
│   ├── ds-tokens.md             # SASS variables, functions, and mixins
│   ├── ds-sass.md               # CSS utility classes + component BEM classes
│   └── ds-theme.md              # 7 themes, colors, ThemeProvider, dark mode
└── .claude/
    └── commands/                # Slash commands developers invoke manually
        ├── ds-react.md          # /ds-react <ComponentName>
        ├── ds-tokens.md         # /ds-tokens <category>
        ├── ds-sass.md           # /ds-sass <query>
        ├── ds-theme.md          # /ds-theme <theme-name>
        ├── ds-scaffold.md       # /ds-scaffold "<description>"
        ├── ds-figma.md          # /ds-figma
        └── ds-review.md         # /ds-review
```

**Naming convention:**
- `ds-<module>` guideline + `ds-<module>` skill → always a pair (same name, different folder)
- `ds-<action>` skills (`ds-scaffold`, `ds-figma`, `ds-review`) → generative, not tied to one module
- Adding a new DS module (e.g. Vue): create `./guidelines/ds-vue.md` + `./.claude/commands/ds-vue.md`

---

## How to adopt in a consumer project

### Method A — Git submodule (recommended)

```bash
# In the consumer project root
git submodule add <this-repo-url> ai

# Update the submodule later
git submodule update --remote ai
```

### Method B — Curl individual files

```bash
mkdir -p ai/guidelines ai/.claude/commands

BASE="https://raw.githubusercontent.com/<org>/<repo>/main"

# Entry point + guidelines
curl -o ai/CLAUDE.md                      $BASE/ai/CLAUDE.md
curl -o ai/guidelines/ds-react.md         $BASE/ai/guidelines/ds-react.md
curl -o ai/guidelines/ds-tokens.md        $BASE/ai/guidelines/ds-tokens.md
curl -o ai/guidelines/ds-sass.md          $BASE/ai/guidelines/ds-sass.md
curl -o ai/guidelines/ds-theme.md         $BASE/ai/guidelines/ds-theme.md

# Skills
curl -o ai/.claude/commands/ds-react.md    $BASE/ai/.claude/commands/ds-react.md
curl -o ai/.claude/commands/ds-tokens.md   $BASE/ai/.claude/commands/ds-tokens.md
curl -o ai/.claude/commands/ds-sass.md     $BASE/ai/.claude/commands/ds-sass.md
curl -o ai/.claude/commands/ds-theme.md    $BASE/ai/.claude/commands/ds-theme.md
curl -o ai/.claude/commands/ds-scaffold.md $BASE/ai/.claude/commands/ds-scaffold.md
curl -o ai/.claude/commands/ds-figma.md    $BASE/ai/.claude/commands/ds-figma.md
curl -o ai/.claude/commands/ds-review.md   $BASE/ai/.claude/commands/ds-review.md
```

### Method C — Manual copy

Copy the `ai/` folder from a cloned or downloaded version of this repo.

---

## Consumer project CLAUDE.md

Create a `CLAUDE.md` at the **root of the consumer project**. Claude Code reads it automatically at the start of every session.

### Option A — One line (import everything)

```md
# [Project Name] — Claude Guidelines

@ai/CLAUDE.md

## Project context
- Active theme: bees
- React Router v6 for routing
- React Hook Form for form state
```

### Option B — Cherry-pick individual guidelines

Open `ai/CLAUDE.md` to see all available imports, then include only what your project uses:

```md
# [Project Name] — Claude Guidelines

@ai/guidelines/ds-react.md
@ai/guidelines/ds-sass.md
@ai/guidelines/ds-theme.md

## Project context
- Active theme: bees
```

**Tip:** Add project-specific notes below the imports — active theme, routing library, form library, coding conventions.

---

## Available skills (slash commands)

Skills are available once `.claude/commands/` is present in the consumer project (copy from `ai/.claude/commands/`).

| Command | Usage | Purpose |
|---|---|---|
| `/ds-react` | `/ds-react Modal` | Look up a component's full API: import, props, enums, examples |
| `/ds-tokens` | `/ds-tokens spacing` | List SASS tokens in a category with values and usage |
| `/ds-sass` | `/ds-sass elevation` | Find CSS utility classes or component BEM classes |
| `/ds-theme` | `/ds-theme bees` | Theme setup, CSS import, colors, dark mode toggle |
| `/ds-scaffold` | `/ds-scaffold "login form"` | Generate a complete TSX file from a UI description |
| `/ds-figma` | `/ds-figma` | Read `figma-export.json` → output DS-correct TSX |
| `/ds-review` | `/ds-review` | Audit selected code for DS usage issues |

---

## Guideline files — what to write and where to get the data

### `./guidelines/ds-react.md`

**Purpose:** Claude's reference for all React components.

**Sections:**
1. Install & import paths
2. Component index (all components listed by layer)
3. Per-component entries: import, CSS class, required props, optional props with type/default, enum values, JSX examples
4. Common patterns (form, modal trigger, responsive grid)

**Data sources in the DS repo:**
```
react/src/components/atoms/*/[Name].config.ts      enums + prop defaults
react/src/components/molecules/*/[Name].config.ts
react/src/components/bosons/*/[Name].config.ts
react/src/components/organisms/*/[Name].config.ts
react/src/components/templates/*/[Name].config.ts
react/src/components/index.tsx                     full component export list
dist/react/main.d.ts                               authoritative TypeScript interfaces
```

**Entry template:**
```md
### DsButton
Import:   import { DsButton } from '@akad/design-system/react'
CSS class: .ds-button
Required: children
Optional:
  color    string  primary|secondary|...  default: primary
  ...
```

---

### `./guidelines/ds-tokens.md`

**Purpose:** Claude's reference for SASS variables, functions, and mixins — for **SCSS authoring**.

**Sections:** Import path, spacing scale, inset spacing, font sizes, font weights, font families, border radius, border width, breakpoint values, breakpoint mixins, opacity, shadows.

**Data sources in the DS repo:**
```
sass/src/core/tokens/spacings.scss
sass/src/core/tokens/typography.scss
sass/src/core/tokens/borders.scss
sass/src/core/tokens/breakpoints.scss
sass/src/core/tokens/opacity.scss
sass/src/core/tokens/shadows.scss
sass/src/core/functions/   function signatures
sass/src/core/mixins/      mixin signatures
sass/SASS-USAGE.md         usage examples
```

---

### `./guidelines/ds-sass.md`

**Purpose:** Claude's reference for CSS classes applied via `className` in JSX/HTML.

**Sections:** Color text classes, color background classes (with auto-contrast), border color classes, display/flexbox classes + responsive variants, order utilities, elevation classes, component BEM class table.

**Data sources in the DS repo:**
```
sass/src/core/helpers/colors.scss
sass/src/core/helpers/display.scss
sass/src/core/helpers/order.scss
sass/src/core/helpers/borders.scss
sass/src/core/helpers/elevation.scss
sass/src/core/atoms/*/        component BEM class names
sass/src/core/molecules/*/
sass/src/core/bosons/*/
```

---

### `./guidelines/ds-theme.md`

**Purpose:** Claude's reference for theming — which themes exist, how to apply them, color palettes.

**Sections:** Theme list, CSS import per theme, ThemeProvider component, data-attribute approach, dark/light toggle, color palettes per theme, shared neutral scale.

**Data sources in the DS repo:**
```
sass/src/themes/*/colors.scss
sass/src/themes/*/typography.scss
react/src/components/molecules/ThemeProvider/ThemeProvider.tsx
sass/SASS-USAGE.md
```

---

## Skill file prompts — full content

Skill files contain only prompt text and never go stale when the DS changes.
Update them only if the skill's behavior or scope needs to change.

### `ds-react.md`
```
For the @akad/design-system React component "$ARGUMENTS":
1. Show the TypeScript import from `@akad/design-system/react`
2. List all props with type, required/optional, and default value
3. List every valid value for each enum prop
4. Show 2–3 JSX usage examples covering different realistic variants
5. Mention companion components commonly used alongside it
Use `./guidelines/ds-react.md` as your reference for the component API.
```

### `ds-tokens.md`
```
List all @akad/design-system SASS tokens in the "$ARGUMENTS" category.
For each token: variable name, value, one-line SCSS usage example.
Valid categories: spacing, inset-spacing, typography, borders, breakpoints, opacity, shadows.
Use `./guidelines/ds-tokens.md` as your reference.
```

### `ds-sass.md`
```
Find @akad/design-system CSS utility classes for: "$ARGUMENTS"
Search: 1) utility helpers (color, bg, border, flex, order, elevation)  2) component BEM classes.
For each class: name, what it does, JSX className example.
Use `./guidelines/ds-sass.md` as your reference.
```

### `ds-theme.md`
```
For the @akad/design-system theme "$ARGUMENTS":
1. CSS import line  2. DsThemeProvider setup  3. data-attribute approach
4. Primary/secondary/semantic hex values  5. Dark/light toggle example
Use `./guidelines/ds-theme.md` as your reference.
```

### `ds-scaffold.md`
```
Build a React UI for: "$ARGUMENTS"
Rules: DS components only, DsFlexLayout/DsGridLayout for structure, DsWrapper/DsSpacer for spacing,
correct enum string values, CSS theme import at top, TypeScript functional component.
Use `./guidelines/ds-react.md` for the component API reference.
```

### `ds-figma.md`
```
Read figma-export.json in the current directory. Map layers → DS components, spacing → tokens,
colors → theme tokens. Output complete TSX with mapping comments per component.
Use `./guidelines/ds-react.md`, `./guidelines/ds-tokens.md`, `./guidelines/ds-theme.md`.
```

### `ds-review.md`
```
Review selected code for DS usage issues:
1. Raw HTML that should be DS components  2. Hardcoded strings instead of enum values
3. Wrong/missing imports  4. Raw layout divs instead of FlexLayout/GridLayout/Spacer/Wrapper
5. Props not matching TypeScript interface
For each: quote problem, explain why, show corrected code.
Use `./guidelines/ds-react.md` as your reference.
```

---

## Figma plugin (companion to `/ds-figma`)

A small Figma plugin (~100 lines) reads the selected frame and writes `figma-export.json` to clipboard. Developer pastes it in the project root and runs `/ds-figma`.

**JSON schema:**
```json
{
  "name": "Frame name",
  "type": "FRAME | COMPONENT | TEXT | RECTANGLE | ...",
  "layout": "VERTICAL | HORIZONTAL | NONE",
  "spacing": 16,
  "padding": { "top": 24, "right": 24, "bottom": 24, "left": 24 },
  "fill": "#FFFFFF",
  "fontFamily": "Open Sans",
  "fontSize": 16,
  "children": [ ...recursive... ]
}
```

---

## Maintenance — when to update

Update guideline files **in the same PR** that changes the DS.

| DS change | File to update |
|---|---|
| New React component | `./guidelines/ds-react.md` |
| Component props or enums changed | `./guidelines/ds-react.md` |
| New SASS variable, function, or mixin | `./guidelines/ds-tokens.md` |
| New CSS utility/helper class | `./guidelines/ds-sass.md` |
| New or updated theme | `./guidelines/ds-theme.md` |
| New DS module (e.g. Vue) | `./guidelines/ds-vue.md` + `./.claude/commands/ds-vue.md` + entry in `CLAUDE.md` |

Skill files (`.claude/commands/`) never go stale — update only if the skill's scope changes.

---

## Adding a new DS module

1. **Create** `./guidelines/ds-<module>.md` — import path, API reference, usage examples
2. **Create** `./.claude/commands/ds-<module>.md`:
   ```
   For the @akad/design-system $MODULE "$ARGUMENTS":
   1. Show the import  2. List the API  3. Show 2–3 examples
   Use `./guidelines/ds-<module>.md` as your reference.
   ```
3. **Add** `@./guidelines/ds-<module>.md` to `./CLAUDE.md`
4. **Announce** to consumer teams so they can update their `CLAUDE.md`

**Rule:** `ds-<module>` guideline and `ds-<module>` skill always ship as a pair.
