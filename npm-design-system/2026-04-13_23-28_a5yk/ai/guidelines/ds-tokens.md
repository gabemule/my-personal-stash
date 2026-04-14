# @akad/design-system — SASS Tokens

Use this reference when **writing SCSS files** that consume the DS.
For CSS utility classes to use in `className`, see `ds-sass.md`.

## Import

```scss
@use '@akad/design-system/scss/core' as ds;
// or
@import '@akad/design-system/scss/core/index.scss';
```

---

## Spacing (`$spacing--*`)

| Variable | Value |
|---|---|
| `$spacing--quark` | 4px |
| `$spacing--nano` | 8px |
| `$spacing--xxxs` | 16px |
| `$spacing--xxs` | 24px |
| `$spacing--xs` | 32px |
| `$spacing--sm` | 40px |
| `$spacing--md` | 48px |
| `$spacing--lg` | 56px |
| `$spacing--xl` | 64px |
| `$spacing--xxl` | 72px |
| `$spacing--xxxl` | 80px |

**Function:** `spacing($key)` — looks up a key from the map above.

```scss
.my-element {
  padding: $spacing--xs;          // 32px
  margin-bottom: spacing('nano'); // 8px
}
```

---

## Inset Spacing (`$spacing__inset--*`)

Uniform padding tokens (square insets).

| Variable | Value |
|---|---|
| `$spacing__inset--quark` | 4px |
| `$spacing__inset--nano` | 8px |
| `$spacing__inset--xs` | 16px |
| `$spacing__inset--sm` | 24px |
| `$spacing__inset--md` | 32px |
| `$spacing__inset--lg` | 40px |

```scss
.card {
  padding: $spacing__inset--sm; // 24px all sides
}
```

---

## Typography — Font Size (`$font__size--*`)

| Variable | Value |
|---|---|
| `$font__size--xxs` | 10px |
| `$font__size--xs` | 12px |
| `$font__size--sm` | 14px |
| `$font__size--md` | 16px |
| `$font__size--lg` | 20px |
| `$font__size--xl` | 24px |
| `$font__size--xxl` | 32px |
| `$font__size--xxxl` | 40px |
| `$font__size--huge` | 56px |

```scss
.label {
  font-size: $font__size--sm; // 14px
}
```

---

## Typography — Font Weight (`$font__weight--*`)

| Variable | Value |
|---|---|
| `$font__weight--extralight` | 200 |
| `$font__weight--light` | 300 |
| `$font__weight--regular` | 400 |
| `$font__weight--medium` | 500 |
| `$font__weight--semibold` | 600 |
| `$font__weight--bold` | 700 |

**Functions:** `font-weight($key)`, `font-family($key)`

```scss
.heading {
  font-weight: $font__weight--semibold; // 600
}
```

---

## Typography — Font Families (theme-specific)

| Variable | Default theme value |
|---|---|
| `$font__family--base` | `'Open Sans'` |
| `$font__family--highlight` | `'Poppins'` |

Font families are declared per theme. The default theme uses Open Sans (base) and Poppins (highlight).

---

## Borders — Radius (`$border__radius--*`)

| Variable | Value |
|---|---|
| `$border__radius--sm` | 4px |
| `$border__radius--md` | 8px |
| `$border__radius--lg` | 24px |
| `$border__radius--pill` | 500px |
| `$border__radius--circular` | 50% |

```scss
.badge {
  border-radius: $border__radius--pill;
}
```

---

## Borders — Width (`$border__width--*`)

| Variable | Value |
|---|---|
| `$border__width--hairline` | 1px |
| `$border__width--thin` | 2px |
| `$border__width--thick` | 4px |
| `$border__width--heavy` | 8px |

---

## Breakpoints

### Mobile shorthand
| Variable | Value |
|---|---|
| `$breakpoint--mobile` | 768px |

### Grid breakpoints (`$grid-breakpoints`)
| Key | Min-width |
|---|---|
| `sm` | 480px |
| `md` | 768px |
| `lg` | 960px |
| `xl` | 1280px |
| `xxl` | 1440px |

### Container widths (`$container-widths`)
| Key | Width |
|---|---|
| `sm` | 450px |
| `md` | 720px |
| `lg` | 940px |
| `xl` | 1128px |
| `xxl` | 1128px |

**Functions:**
```scss
device-min($name)  // Returns min-width for a breakpoint key
device-max($name)  // Returns max-width (next breakpoint - 0.02px)
breakpoint($key)   // Returns value from $breakpoint map (mobile only)
```

---

## Breakpoint Mixins

```scss
// Max-width: 768px (mobile-only)
@include mobile { ... }

// Min-width breakpoints (responsive-up)
@include device-up(sm)  { ... }  // ≥ 480px
@include device-up(md)  { ... }  // ≥ 768px
@include device-up(lg)  { ... }  // ≥ 960px
@include device-up(xl)  { ... }  // ≥ 1280px
@include device-up(xxl) { ... }  // ≥ 1440px

// Max-width breakpoints (responsive-down)
@include device-down(sm)  { ... }  // ≤ 479.98px
@include device-down(md)  { ... }  // ≤ 767.98px
@include device-down(lg)  { ... }  // ≤ 959.98px
@include device-down(xl)  { ... }  // ≤ 1279.98px

// Between two breakpoints
@include device-between(sm, lg) { ... }  // 480px – 959.98px

// Exact breakpoint only
@include device-only(md) { ... }  // 768px – 959.98px
```

**Usage example:**
```scss
.hero {
  font-size: $font__size--xxl;

  @include mobile {
    font-size: $font__size--xl;
  }

  @include device-up(xl) {
    font-size: $font__size--huge;
  }
}
```

---

## Opacity (`$opacity--*`)

| Variable | Value |
|---|---|
| `$opacity--lighter` | 0.15 |
| `$opacity--light` | 0.3 |
| `$opacity--medium` | 0.5 |
| `$opacity--heavy` | 0.7 |
| `$opacity--heavier` | 0.85 |

```scss
.overlay {
  opacity: $opacity--medium; // 0.5
}
```

---

## Shadows (`$shadow__level--*`)

Structural shadows — same across all themes.

| Variable | Description |
|---|---|
| `$shadow__level--1` | Subtle — cards at rest |
| `$shadow__level--2` | Light — hover states |
| `$shadow__level--3` | Medium — dropdowns, tooltips |
| `$shadow__level--4` | Strong — modals, drawers |

```scss
.card {
  box-shadow: $shadow__level--1;

  &:hover {
    box-shadow: $shadow__level--2;
  }
}
```

---

## Grid Mixin

```scss
// Span columns in a grid
@include grid-col($columns: 6); // span 6 columns
```
