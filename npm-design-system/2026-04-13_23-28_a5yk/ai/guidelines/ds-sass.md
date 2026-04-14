# @akad/design-system — CSS Utility Classes

Use this reference when adding `className` to JSX/HTML elements.
For SASS variables and mixins used in `.scss` files, see `ds-tokens.md`.

These classes are available when the theme CSS is imported:
```js
import '@akad/design-system/css/theme-default.css'; // or any other theme
```

---

## Color — Text (`color__*`)

Apply text color using CSS custom properties (respects active theme).

### Primary (6 shades)
```
.color__primary             .color__primary--darker
.color__primary--dark       .color__primary--default
.color__primary--light      .color__primary--lighter
.color__primary--lightest
```

### Secondary (6 shades)
```
.color__secondary           .color__secondary--darker
.color__secondary--dark     .color__secondary--default
.color__secondary--light    .color__secondary--lighter
.color__secondary--lightest
```

### Neutral (12-point scale)
```
.color__neutral--00    .color__neutral--05    .color__neutral--10
.color__neutral--20    .color__neutral--30    .color__neutral--40
.color__neutral--50    .color__neutral--60    .color__neutral--70
.color__neutral--80    .color__neutral--90    .color__neutral--100
```
> Single-hyphen aliases also available: `.color__neutral-90`, `.color__neutral-00`, etc.

### Semantic (4 shades each)
```
.color__success   .color__success--dark   .color__success--light   .color__success--lighter
.color__warning   .color__warning--dark   .color__warning--light   .color__warning--lighter
.color__danger    .color__danger--dark    .color__danger--light    .color__danger--lighter
.color__info      .color__info--dark      .color__info--light      .color__info--lighter
```

**JSX example:**
```tsx
<span className="color__primary">Primary text</span>
<span className="color__danger--dark">Error message</span>
<span className="color__neutral--60">Muted label</span>
```

---

## Color — Background (`bg-color__*`)

Sets `background-color` and auto-applies a contrast text color.

### Primary / Secondary backgrounds (6 shades each)
```
.bg-color__primary              .bg-color__primary--darker
.bg-color__primary--dark        .bg-color__primary--light
.bg-color__primary--lighter     .bg-color__primary--lightest
.bg-color__secondary            .bg-color__secondary--darker
.bg-color__secondary--dark      .bg-color__secondary--light
.bg-color__secondary--lighter   .bg-color__secondary--lightest
```
> Dark shades (`darker`, `dark`, `default`) → light text auto-applied.
> Light shades (`light`, `lighter`, `lightest`) → dark text auto-applied.

### Neutral backgrounds (12-point scale)
```
.bg-color__neutral--00  through  .bg-color__neutral--100
```
> Single-hyphen aliases: `.bg-color__neutral-90`, etc.

### Semantic backgrounds (4 shades each)
```
.bg-color__success   .bg-color__success--dark   .bg-color__success--light   .bg-color__success--lighter
.bg-color__warning   .bg-color__warning--dark   .bg-color__warning--light   .bg-color__warning--lighter
.bg-color__danger    .bg-color__danger--dark    .bg-color__danger--light    .bg-color__danger--lighter
.bg-color__info      .bg-color__info--dark      .bg-color__info--light      .bg-color__info--lighter
```

**JSX example:**
```tsx
<div className="bg-color__primary">         {/* primary bg + auto contrast text */}
<div className="bg-color__neutral--05">     {/* near-white background */}
<div className="bg-color__success--light">  {/* light green background */}
```

---

## Border Color (`border-color__*`)

Applies a **left border** (solid, 4px) with the specified theme color.

### Primary / Secondary (6 shades each)
```
.border-color__primary              .border-color__primary--darker
.border-color__primary--dark        .border-color__primary--light
.border-color__primary--lighter     .border-color__primary--lightest
.border-color__secondary            (same pattern)
```

### Neutral (12-point scale)
```
.border-color__neutral--00  through  .border-color__neutral--100
```
> Single-hyphen aliases: `.border-color__neutral-30`, etc.

### Semantic (4 shades each)
```
.border-color__success   .border-color__success--dark   .border-color__success--light   .border-color__success--lighter
.border-color__warning   (same pattern)
.border-color__danger    (same pattern)
.border-color__info      (same pattern)
```

**JSX example:**
```tsx
<div className="border-color__primary">        {/* left border in primary color */}
<div className="border-color__danger--dark">   {/* left border in dark danger red */}
<div className="border-color__neutral--30">    {/* left border in light gray */}
```

---

## Display & Flexbox (`d-*`)

### Display
```
.d-block         display: block
.d-inline-block  display: inline-block
.d-flex          display: flex
.d-none          display: none
```

### Flex direction
```
.d-flex__direction--row            flex-direction: row
.d-flex__direction--row-reverse    flex-direction: row-reverse
.d-flex__direction--column         flex-direction: column
.d-flex__direction--column-reverse flex-direction: column-reverse
```

### Flex align-items
```
.d-flex__align--start    align-items: flex-start
.d-flex__align--center   align-items: center
.d-flex__align--end      align-items: flex-end
.d-flex__align--stretch  align-items: stretch
```

### Flex justify-content
```
.d-flex__justify--start   justify-content: flex-start
.d-flex__justify--center  justify-content: center
.d-flex__justify--end     justify-content: flex-end
.d-flex__justify--beetwen justify-content: space-between  ⚠️ typo in class name
.d-flex__justify--around  justify-content: space-around
.d-flex__justify--evenly  justify-content: space-evenly
```

### Flex gap (spacing scale)
```
.d-flex__gap--quark   gap: 4px
.d-flex__gap--nano    gap: 8px
.d-flex__gap--xxxs    gap: 16px
.d-flex__gap--xxs     gap: 24px
.d-flex__gap--xs      gap: 32px
.d-flex__gap--sm      gap: 40px
.d-flex__gap--md      gap: 48px
.d-flex__gap--lg      gap: 56px
.d-flex__gap--xl      gap: 64px
.d-flex__gap--xxl     gap: 72px
.d-flex__gap--xxxl    gap: 80px
```

### Mobile responsive variants (≤ 768px)
All desktop flex classes have a `.d-sm-*` variant that activates at `max-width: 768px`:
```
.d-sm-flex   .d-sm-none   .d-sm-block
.d-sm-flex__direction--column
.d-sm-flex__align--center
.d-sm-flex__justify--center
.d-sm-flex__gap--xs
```

**JSX example:**
```tsx
<div className="d-flex d-flex__direction--row d-flex__justify--beetwen d-flex__align--center d-flex__gap--xs
                d-sm-flex d-sm-flex__direction--column">
  <span>Item A</span>
  <span>Item B</span>
</div>
```

---

## Order (`order--*`)

Flex order utilities (1–12), with responsive breakpoint variants.

### Static
```
.order--1  through  .order--12
```

### Responsive (per breakpoint)
```
.order--sm-1    through  .order--sm-12    (≥ 480px)
.order--md-1    through  .order--md-12    (≥ 768px)
.order--lg-1    through  .order--lg-12    (≥ 960px)
.order--xl-1    through  .order--xl-12    (≥ 1280px)
.order--xxl-1   through  .order--xxl-12   (≥ 1440px)
```

**JSX example:**
```tsx
<div className="d-flex">
  <div className="order--2 order--md-1">First on desktop, second on mobile</div>
  <div className="order--1 order--md-2">Second on desktop, first on mobile</div>
</div>
```

---

## Elevation (`elevation-*`)

Applies `box-shadow` at four depth levels.

```
.elevation-1   subtle shadow    (cards at rest)
.elevation-2   light shadow     (hover states)
.elevation-3   medium shadow    (dropdowns, tooltips)
.elevation-4   strong shadow    (modals, drawers)
```

**JSX example:**
```tsx
<div className="elevation-2">Elevated card</div>
<DsCard className="elevation-3" />
```

---

## Component BEM Classes

Each DS component exposes CSS classes for direct use or style overrides.

| Component | Root class |
|---|---|
| DsButton | `.ds-button` |
| DsCaption | `.ds-caption` |
| DsCard | `.ds-card` |
| DsCheckbox | `.ds-checkbox` |
| DsHeading | `.ds-heading` |
| DsHorizontalRule | `.ds-hr` |
| DsIcon | `.ds-icon` |
| DsInput | `.ds-input` |
| DsLoading | `.ds-loading` |
| DsOption | `.ds-option` |
| DsParagraph | `.ds-paragraph` |
| DsProgress | `.ds-progress` |
| DsSelect | `.ds-select` |
| DsSubtitle | `.ds-subtitle` |
| DsTextArea | `.ds-textarea` |
| DsTooltip | `.ds-tooltip` |
| DsContainer | `.ds-container` |
| DsFlexLayout | `.ds-flex-layout` |
| DsFlexElement | `.ds-flex-element` |
| DsGridLayout | `.ds-grid-layout` |
| DsGridElement | `.ds-grid-element` |
| DsSpacer | `.ds-spacer` |
| DsWrapper | `.ds-wrapper` |
| DsAccordion | `.ds-accordion` |
| DsAccordionItem | `.ds-accordion-item` |
| DsActiveTags | `.ds-active-tags` |
| DsCarousel | `.ds-carousel` |
| DsEditableSelect | `.ds-editable-select` |
| DsIndicator | `.ds-indicator` |
| DsInlineEditable | `.ds-inline-editable` |
| DsModal | `.ds-modal` |
| DsNotification | `.ds-notification` |
| DsPasswordConfirmation | `.ds-password-confirmation` |
| DsStepper | `.ds-stepper` |
| DsTable | `.ds-table` |
| DsTabs | `.ds-tabs` |
| DsThemeProvider | `.ds-theme-provider` |
| DsNotificationList | `.ds-notification-list` |
| DsSplitLayout | `.ds-split-layout` |
| DsTwoColumns | `.ds-two-columns` |

**Override example:**
```scss
// In your SCSS, target DS component internals
.ds-button {
  border-radius: 0; // Override button border-radius for this project
}

.ds-card {
  border: 1px solid var(--color__neutral--20);
}
```
