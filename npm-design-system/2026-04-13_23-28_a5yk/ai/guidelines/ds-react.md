# @akad/design-system — React Components

## Install & import

```bash
npm install @akad/design-system
# or
yarn add @akad/design-system
```

```tsx
// Import components
import { DsButton, DsInput, DsModal } from '@akad/design-system/react';

// Import theme CSS (required — pick one theme)
import '@akad/design-system/css/theme-default.css';
// Other themes: theme-aon | theme-bees | theme-bmc | theme-linker | theme-oggi | theme-streetgo
```

Peer dependencies: `react ^18.2.0`, `react-dom ^18.2.0`

---

## Component index

**Atoms:** DsButton, DsCaption, DsCard, DsCheckbox, DsHeading, DsHorizontalRule, DsIcon, DsInput, DsLoading, DsOption, DsParagraph, DsProgress, DsSelect, DsSubtitle, DsTextArea, DsTooltip

**Bosons (layout):** DsContainer, DsFlexLayout, DsFlexElement, DsGridLayout, DsGridElement, DsSpacer, DsWrapper

**Molecules:** DsAccordion, DsAccordionItem, DsActiveTags, DsCarousel, DsEditableSelect, DsIndicator, DsInlineEditable, DsModal, DsNotification, DsPasswordConfirmation, DsStepper, DsTable, DsTabs, DsThemeProvider

**Organisms:** DsNotificationList

**Templates:** DsSplitLayout, DsTwoColumns

---

## Atoms

### DsButton
```
Import:   import { DsButton } from '@akad/design-system/react'
CSS class: .ds-button
Required: children (string | ReactNode)
Optional:
  color       string   primary|secondary|info|success|danger|warning|neutral   default: primary
  variant     string   solid|outline|text                                       default: solid
  size        string   lg|md|sm                                                 default: md
  elevation   number   1|2|3|4
  icon        string   Google Material icon name
  iconFill    boolean                                                            default: true
  iconPosition string  right|left                                               default: right
  disabled    boolean                                                            default: false
  fullSize    boolean                                                            default: false
  id          string
  className   string
  testId      string
  gtmId       string
  gtmLabel    string
  onClick     () => void
```

```tsx
<DsButton color="primary" variant="solid" size="md">Save</DsButton>
<DsButton color="danger" variant="outline" size="sm" icon="delete">Delete</DsButton>
<DsButton color="secondary" variant="text" fullSize disabled>Disabled</DsButton>
```

---

### DsCaption
```
Import:   import { DsCaption } from '@akad/design-system/react'
CSS class: .ds-caption
Required: children (ReactNode)
Optional: className, id, testId
```

```tsx
<DsCaption>Helper text or caption content</DsCaption>
```

---

### DsCard
```
Import:   import { DsCard } from '@akad/design-system/react'
CSS class: .ds-card
Required: children (ReactNode)
Optional:
  backgroundColor  string  (CardColor enum — see values below)  default: '' (none)
  borderColor      string  (CardColor enum)                      default: '' (none)
  elevation        number  0|1|2|3|4                             default: 0
  id               string
  className        string
  testId           string
  gtmId            string
  gtmLabel         string

CardColor values: '' | primary-darker | primary-dark | primary | primary-light | primary-lighter |
  primary-lightest | secondary-darker | secondary-dark | secondary | secondary-light |
  secondary-lighter | secondary-lightest | neutral-90 | neutral-80 | neutral-60 | neutral-40 |
  neutral-20 | neutral-10 | neutral-05 | neutral-00 | success-dark | success | success-light |
  success-lighter | warning-dark | warning | warning-light | warning-lighter | danger-dark |
  danger | danger-light | danger-lighter | info-dark | info | info-light | info-lighter
```

```tsx
<DsCard elevation={1}>
  <p>Card content</p>
</DsCard>
<DsCard backgroundColor="primary-lightest" borderColor="primary" elevation={2}>
  Highlighted card
</DsCard>
```

---

### DsCheckbox
```
Import:   import { DsCheckbox } from '@akad/design-system/react'
CSS class: .ds-checkbox
Required: (none required)
Optional:
  name             string
  label            string | ReactNode                            default: ''
  description      string | ReactNode                            default: ''
  checked          boolean                                       default: false
  disabled         boolean                                       default: false
  changeByChecked  boolean                                       default: false
  id               string
  className        string
  testId           string
  onChangeHandler  (e: React.ChangeEvent<HTMLInputElement>) => void
```

```tsx
<DsCheckbox
  label="Accept terms"
  checked={accepted}
  onChangeHandler={e => setAccepted(e.target.checked)}
/>
```

---

### DsHeading
```
Import:   import { DsHeading } from '@akad/design-system/react'
CSS class: .ds-heading
Required: children (ReactNode)
Optional:
  type  string  heading-1|heading-2|heading-3|heading-4|heading-5|heading-6  default: heading-1
  className, id, testId
```

```tsx
<DsHeading type="heading-2">Page Title</DsHeading>
<DsHeading type="heading-4">Section Title</DsHeading>
```

---

### DsHorizontalRule
```
Import:   import { DsHorizontalRule } from '@akad/design-system/react'
CSS class: .ds-hr
Required: (none)
Optional:
  borderStyle  string  '' | dashed | dotted  default: ''
  size         string  '' | small | large     default: ''
  className, testId
```

```tsx
<DsHorizontalRule />
<DsHorizontalRule borderStyle="dashed" size="small" />
```

---

### DsIcon
```
Import:   import { DsIcon } from '@akad/design-system/react'
CSS class: .ds-icon
Required: (none)
Optional:
  image      string   Google Material icon name            default: 'settings'
  color      string   (IconColor enum — see below)         default: neutral-90
  size       string   xxs|xs|sm|md|lg|xl|xxl|xxxl|huge     default: md
  variation  string   outlined|rounded|sharp               default: outlined
  weight     string   bold|semibold|medium|regular|light|extralight  default: semibold
  fill       boolean                                        default: false
  testId     string
  onClick    () => void

IconColor values: primary | primary-lightest | primary-lighter | primary-light | primary-dark |
  primary-darker | neutral-90..neutral-00 | secondary | secondary-lightest...secondary-darker |
  success | success-lighter | success-light | success-dark | warning... | danger... | info...
```

```tsx
<DsIcon image="home" size="md" color="primary" />
<DsIcon image="delete" size="sm" color="danger" fill variation="rounded" />
```

---

### DsInput
```
Import:   import { DsInput } from '@akad/design-system/react'
CSS class: .ds-input
Required: name (string)
Optional:
  type            string   text|password|email|date|number  default: text
  label           string                                     default: ''
  placeholder     string                                     default: ' '
  value           string                                     default: ''
  size            string   small|medium|large                default: medium
  status          string   '' | error | success              default: ''
  feedback        string   (message shown with status)       default: ''
  hasFeedback     boolean                                     default: true
  animated        boolean  (floating label animation)        default: true
  disabled        boolean                                     default: false
  icon            string   Google Material icon name
  tooltip         string
  tooltipPosition string   top|right|bottom|left             default: top
  tooltipPlacement string  center|end|initial                default: center
  mask            string   imask pattern
  min             string
  max             string
  noMargin        boolean                                     default: false
  testId          string
  onChangeHandler (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlurHandler   (e: React.FocusEvent<HTMLInputElement>) => void
  onKeyDownHandler (e: React.KeyboardEvent<HTMLInputElement>) => void
  onFocusHandler  (e: React.FocusEvent<HTMLInputElement>) => void
```

```tsx
<DsInput name="email" type="email" label="Email" value={email} onChangeHandler={e => setEmail(e.target.value)} />
<DsInput name="phone" label="Phone" mask="(00) 00000-0000" status="error" feedback="Invalid phone" />
<DsInput name="pwd" type="password" label="Password" animated={false} />
```

---

### DsLoading
```
Import:   import { DsLoading } from '@akad/design-system/react'
CSS class: .ds-loading
Required: (none)
Optional:
  size            string   small|medium|large   default: medium
  opacity         boolean                        default: true
  fullscreen      boolean                        default: true
  backgroundColor string   ''|neutral-20|neutral-10|neutral-05|neutral-00  default: neutral-10
  id              string
  testId          string
```

```tsx
<DsLoading size="large" fullscreen backgroundColor="neutral-10" />
<DsLoading size="small" fullscreen={false} />
```

---

### DsOption
```
Import:   import { DsOption } from '@akad/design-system/react'
CSS class: .ds-option
Required: (none required)
Optional:
  label            string
  value            string
  detail           string   (secondary line of text)
  checked          boolean   default: false
  disabled         boolean   default: false
  name             string
  id               string
  testId           string
  onChangeHandler  (e: React.ChangeEvent<HTMLInputElement>) => void
```

```tsx
<DsOption label="Option A" value="a" checked={selected === 'a'} onChangeHandler={handleChange} />
```

---

### DsParagraph
```
Import:   import { DsParagraph } from '@akad/design-system/react'
CSS class: .ds-paragraph
Required: children (ReactNode)
Optional:
  type       string  '' | large | small  default: ''
  className, id, testId
```

```tsx
<DsParagraph>Body copy text</DsParagraph>
<DsParagraph type="small">Small print</DsParagraph>
```

---

### DsProgress
```
Import:   import { DsProgress } from '@akad/design-system/react'
CSS class: .ds-progress
Required: (none)
Optional:
  progress  number  0–100         default: 0
  label     string                default: ''
  color     string  success|success-dark|warning|danger  default: success
```

```tsx
<DsProgress progress={75} label="75% complete" color="success" />
<DsProgress progress={30} color="warning" />
```

---

### DsSelect
```
Import:   import { DsSelect } from '@akad/design-system/react'
CSS class: .ds-select
Required: (none required, but options and onChange are typical)
Optional:
  options      array    [{ label, value } | { label, options[] }]
  value        string | number | boolean
  label        string                                    default: ''
  placeholder  string
  size         string   sm|md|lg                         default: md
  status       string   ''|error|success                 default: ''
  feedback     string                                    default: ''
  animated     boolean                                   default: true
  disabled     boolean                                   default: false
  multiple     boolean                                   default: false
  name         string
  tooltip      string
  tooltipPosition string  top|right|bottom|left           default: top
  tooltipPlacement string center|end|initial             default: initial
  className    string
  testId       string
  onChange     () => void
```

```tsx
<DsSelect
  label="Country"
  options={[{ label: 'Brazil', value: 'br' }, { label: 'USA', value: 'us' }]}
  value={country}
  onChange={e => setCountry(e.target.value)}
/>
```

---

### DsSubtitle
```
Import:   import { DsSubtitle } from '@akad/design-system/react'
CSS class: .ds-subtitle
Required: children (ReactNode)
Optional:
  type  string  large|small  default: large
  className, id, testId
```

```tsx
<DsSubtitle type="large">Section Subtitle</DsSubtitle>
```

---

### DsTextArea
```
Import:   import { DsTextArea } from '@akad/design-system/react'
CSS class: .ds-textarea
Required: name (string)
Optional:
  label           string                                     default: ''
  placeholder     string                                     default: ' '
  value           string                                     default: ''
  size            string   small|medium|large                default: medium
  status          string   ''|error|success                  default: ''
  feedback        string                                     default: ''
  description     string                                     default: ''
  animated        boolean                                    default: true
  disabled        boolean                                    default: false
  rows            number                                     default: 1
  minLength       number
  maxLength       number
  resize          string   none|both|horizontal|vertical|block|inline  default: none
  icon            string
  tooltip         string
  testId          string
  onChangeHandler (e: React.ChangeEvent<HTMLTextAreaElement>) => void
```

```tsx
<DsTextArea name="notes" label="Notes" rows={4} maxLength={500} />
<DsTextArea name="bio" label="Bio" resize="vertical" status="error" feedback="Too long" />
```

---

### DsTooltip
```
Import:   import { DsTooltip } from '@akad/design-system/react'
CSS class: .ds-tooltip
Required: (none required — typically wraps a trigger element)
Optional:
  text       string                             default: ''
  position   string  top|right|bottom|left      default: top
  placement  string  center|end|initial         default: center
  testId     string
```

```tsx
<DsTooltip text="More info" position="right">
  <DsIcon image="info" />
</DsTooltip>
```

---

## Bosons (Layout)

### DsContainer
```
Import:   import { DsContainer } from '@akad/design-system/react'
CSS class: .ds-container
Required: children (ReactNode)
Optional:
  fluid   boolean  (full-width, no max-width)  default: false
  testId  string
```

```tsx
<DsContainer>
  <p>Centered, max-width content</p>
</DsContainer>
<DsContainer fluid>Full-width content</DsContainer>
```

---

### DsFlexLayout + DsFlexElement
```
Import:   import { DsFlexLayout, DsFlexElement } from '@akad/design-system/react'
CSS class: .ds-flex-layout / .ds-flex-element

DsFlexLayout props:
  justifyContent  string  stretch|flex-start|flex-end|center|space-around|space-between  required, default: stretch
  alignItems      string  stretch|flex-start|flex-end|center                             required, default: stretch
  flexDirection   string  row|column|row-reverse|column-reverse                          required, default: row
  flexWrap        string  nowrap|wrap|wrap-reverse                                        default: wrap
  gap             string  quark|nano|xxxs|xxs|xs|sm|md|lg|xl|xxl|xxxl
  width           string                                                                  default: 100%
  height          string
  className       string

DsFlexElement props:
  flex       string  CSS flex shorthand  default: '0 1 auto'
  className  string
```

```tsx
<DsFlexLayout justifyContent="space-between" alignItems="center" flexDirection="row" gap="xs">
  <DsFlexElement flex="1 1 auto">
    <DsHeading type="heading-3">Title</DsHeading>
  </DsFlexElement>
  <DsFlexElement>
    <DsButton color="primary">Action</DsButton>
  </DsFlexElement>
</DsFlexLayout>
```

---

### DsGridLayout + DsGridElement
```
Import:   import { DsGridLayout, DsGridElement } from '@akad/design-system/react'
CSS class: .ds-grid-layout / .ds-grid-element

DsGridLayout props:
  rows             string  CSS grid-template-rows / columns  required, default: auto
  gap              string  quark|nano|xs|sm|md|lg             default: sm
  vGap             boolean (vertical gap)                     default: true
  hGap             boolean (horizontal gap)                   default: true
  width            string
  height           string
  horizontalAlign  string  start|end|center|stretch|space-around|space-between|space-evenly  default: start
  verticalAlign    string  (same options)                                                     default: start

DsGridElement props:
  grid  object  { row: string, col: string }  default: { row: 'auto', col: 'auto' }
```

```tsx
<DsGridLayout rows="repeat(2, 1fr)" gap="md">
  <DsGridElement grid={{ row: '1', col: '1 / 3' }}>
    <DsHeading type="heading-2">Full-width heading</DsHeading>
  </DsGridElement>
  <DsGridElement><DsCard>Card A</DsCard></DsGridElement>
  <DsGridElement><DsCard>Card B</DsCard></DsGridElement>
</DsGridLayout>
```

---

### DsSpacer
```
Import:   import { DsSpacer } from '@akad/design-system/react'
CSS class: .ds-spacer
Required: (none)
Optional:
  vertical    string  none|quark|nano|xxxs|xxs|xs|sm  default: none
  horizontal  string  (same values)                   default: none
```

```tsx
<DsSpacer vertical="xs" />
<DsSpacer vertical="sm" horizontal="nano" />
```

---

### DsWrapper
```
Import:   import { DsWrapper } from '@akad/design-system/react'
CSS class: .ds-wrapper
Required: children (ReactNode)
Optional:
  space   string  none|quark|nano|xs|sm|md|lg  (all sides)  default: xs
  top     string  (same values, overrides space for top)     default: none
  right   string  (same, overrides right)                    default: none
  bottom  string  (same, overrides bottom)                   default: none
  left    string  (same, overrides left)                     default: none
```

```tsx
<DsWrapper space="sm">
  <DsCard>Padded content</DsCard>
</DsWrapper>
<DsWrapper top="md" bottom="md">
  <DsHeading type="heading-3">Section</DsHeading>
</DsWrapper>
```

---

## Molecules

### DsAccordion + DsAccordionItem
```
Import:   import { DsAccordion, DsAccordionItem } from '@akad/design-system/react'
CSS class: .ds-accordion / .ds-accordion-item

DsAccordion props:
  items              array    AccordionItem data array    default: []
  activeItem         number   initially open item index  default: 0
  openItemListIndex  boolean  allow multiple open        default: false

DsAccordionItem props:
  title    string   default: ''
  content  string   default: ''
  active   boolean  default: false
  disabled boolean  default: false
```

```tsx
<DsAccordion activeItem={0}>
  <DsAccordionItem title="Section 1" content="Content here" active />
  <DsAccordionItem title="Section 2" content="More content" />
</DsAccordion>
```

---

### DsActiveTags
```
Import:   import { DsActiveTags } from '@akad/design-system/react'
CSS class: .ds-active-tags
Required: (none required)
Optional:
  title         string  default: ''
  activeTags    array   [{ label, value }]  default: []
  handleTagClose (tag) => void
```

```tsx
<DsActiveTags
  title="Active filters:"
  activeTags={[{ label: 'React', value: 'react' }]}
  handleTagClose={tag => removeTag(tag)}
/>
```

---

### DsCarousel
```
Import:   import { DsCarousel } from '@akad/design-system/react'
CSS class: .ds-carousel
Required: children (ReactNode)
```

```tsx
<DsCarousel>
  <DsCard>Slide 1</DsCard>
  <DsCard>Slide 2</DsCard>
  <DsCard>Slide 3</DsCard>
</DsCarousel>
```

---

### DsEditableSelect
```
Import:   import { DsEditableSelect } from '@akad/design-system/react'
CSS class: .ds-editable-select
Required: (none required)
Optional:
  label              string                         default: ''
  placeholder        string                         default: ''
  value              string                         default: ''
  name               string                         default: ''
  size               string  small|medium|large     default: medium
  status             string                         default: ''
  options            array   [{ label, value }]     default: []
  animated           boolean                        default: true
  disabled           boolean                        default: false
  loading            boolean
  icon               string
  noOptionsMessage   string                         default: 'Nenhum resultado encontrado'
  testId             string
  onChangeHandler    (value) => void
  onBlurHandler      () => void
  onFocusHandler     () => void
  onSelectHandler    (option) => void
```

```tsx
<DsEditableSelect
  label="City"
  options={cities}
  value={city}
  onSelectHandler={opt => setCity(opt.value)}
  size="medium"
/>
```

---

### DsIndicator
```
Import:   import { DsIndicator } from '@akad/design-system/react'
CSS class: .ds-indicator
Required: length (number)
Optional:
  current  number  default: 0
```

```tsx
<DsIndicator current={2} length={5} />
```

---

### DsInlineEditable
```
Import:   import { DsInlineEditable } from '@akad/design-system/react'
CSS class: .ds-inline-editable
Required: name (string)
Optional:
  value            string  default: ''
  prefix           string  default: ''
  suffix           string  default: ''
  min              string  default: ''
  max              string  default: ''
  onChangeHandler  (e) => void
```

```tsx
<DsInlineEditable name="price" value="99.90" prefix="R$" onChangeHandler={handleChange} />
```

---

### DsModal
```
Import:   import { DsModal } from '@akad/design-system/react'
CSS class: .ds-modal
Required: content (ReactNode), onClose (() => void)
Optional:
  title           ReactNode
  isModalOpen     boolean                    default: false
  variant         string   squared|rounded   default: rounded
  elevation       number   1|2|3|4
  cancelBtnText   string                     default: 'Cancelar'
  confirmBtnText  string                     default: 'Confirmar'
  onCancel        () => void
  onConfirm       () => void
```

```tsx
<DsModal
  title="Confirm Delete"
  content={<DsParagraph>Are you sure you want to delete this item?</DsParagraph>}
  isModalOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onCancel={() => setIsOpen(false)}
  onConfirm={handleDelete}
  confirmBtnText="Delete"
  cancelBtnText="Cancel"
/>
```

---

### DsNotification
```
Import:   import { DsNotification } from '@akad/design-system/react'
CSS class: .ds-notification
Required: (none required — typically children for content)
Optional:
  type           string   success|danger|warning|info  default: info
  variant        string   rounded|squared              default: rounded
  elevation      number   1|2|3|4
  autoClose      boolean                               default: false
  autoCloseTimer number   (ms)                         default: 4000
  dismissible    boolean                               default: false
  progressBar    boolean                               default: true
  id             string
  testId         string
```

```tsx
<DsNotification type="success" dismissible autoClose autoCloseTimer={3000}>
  Changes saved successfully!
</DsNotification>
```

---

### DsPasswordConfirmation
```
Import:   import { DsPasswordConfirmation } from '@akad/design-system/react'
CSS class: .ds-password-confirmation
Required: (none required)
Optional:
  instructionLabel  string  default: 'A senha deverá conter:'
  validationList    array   [{ label, regex }]  (4 default rules)
  testId            string
  onChange          (isValid: boolean) => void
```

```tsx
<DsPasswordConfirmation onChange={isValid => setPasswordValid(isValid)} />
```

---

### DsStepper
```
Import:   import { DsStepper } from '@akad/design-system/react'
CSS class: .ds-stepper
Required: steps (array)
Optional:
  selectedStep  number  default: 0
```

```tsx
<DsStepper
  steps={[{ label: 'Personal Info' }, { label: 'Address' }, { label: 'Review' }]}
  selectedStep={currentStep}
/>
```

---

### DsTable
```
Import:   import { DsTable } from '@akad/design-system/react'
CSS class: .ds-table
Required: (none required)
Optional:
  header   array  column header definitions   default: []
  columns  array  column configuration        default: []
  items    array  row data                    default: []
```

```tsx
<DsTable
  header={[{ label: 'Name' }, { label: 'Role' }]}
  columns={[{ key: 'name' }, { key: 'role' }]}
  items={[{ name: 'Alice', role: 'Admin' }, { name: 'Bob', role: 'User' }]}
/>
```

---

### DsTabs + DsTab
```
Import:   import { DsTabs } from '@akad/design-system/react'
CSS class: .ds-tabs
Required: tabs (array)
Optional:
  selectedTab  number  default: 0
  color        string  '' | primary|secondary|neutral|success|warning|danger|info  default: primary
  className    string
  onChange     (index: number) => void
```

```tsx
<DsTabs
  tabs={[{ label: 'Overview' }, { label: 'Details' }, { label: 'History' }]}
  selectedTab={activeTab}
  color="primary"
  onChange={setActiveTab}
/>
```

---

### DsThemeProvider
```
Import:   import { DsThemeProvider } from '@akad/design-system/react'
CSS class: .ds-theme-provider
Required: children (ReactNode)
Optional:
  theme    string  light|dark  default: light
  library  string  core|mkt   default: core
```

```tsx
<DsThemeProvider theme="light" library="core">
  <App />
</DsThemeProvider>
```

---

## Organisms

### DsNotificationList
```
Import:   import { DsNotificationList } from '@akad/design-system/react'
CSS class: .ds-notification-list
Required: (none required)
Optional:
  position   string  top-left|top-center|top-right|bottom-left|bottom-center|bottom-right
                     default: top-right
  fluid      boolean  default: false
  className  string
```

```tsx
<DsNotificationList position="top-right">
  <DsNotification type="success">Saved!</DsNotification>
  <DsNotification type="danger">Error occurred.</DsNotification>
</DsNotificationList>
```

---

## Templates

### DsSplitLayout
```
Import:   import { DsSplitLayout } from '@akad/design-system/react'
CSS class: .ds-split-layout
Required: children (ReactNode — expects two children: left panel, right panel)
```

```tsx
<DsSplitLayout>
  <div>Left panel — e.g. form or hero image</div>
  <div>Right panel — e.g. content or illustration</div>
</DsSplitLayout>
```

---

### DsTwoColumns
```
Import:   import { DsTwoColumns } from '@akad/design-system/react'
CSS class: .ds-two-columns
Required: children (ReactNode — expects two children)
```

```tsx
<DsTwoColumns>
  <DsCard>Primary content</DsCard>
  <DsCard>Sidebar content</DsCard>
</DsTwoColumns>
```

---

## Common patterns

### Form layout
```tsx
import { DsInput, DsSelect, DsButton, DsFlexLayout, DsWrapper } from '@akad/design-system/react';

function LoginForm() {
  return (
    <DsWrapper space="md">
      <DsFlexLayout flexDirection="column" justifyContent="flex-start" alignItems="stretch" gap="xs">
        <DsInput name="email" type="email" label="Email" value={email} onChangeHandler={e => setEmail(e.target.value)} />
        <DsInput name="password" type="password" label="Password" value={password} onChangeHandler={e => setPassword(e.target.value)} />
        <DsButton color="primary" variant="solid" fullSize>Sign in</DsButton>
      </DsFlexLayout>
    </DsWrapper>
  );
}
```

### Modal with trigger
```tsx
const [open, setOpen] = useState(false);

<DsButton color="danger" variant="outline" onClick={() => setOpen(true)}>Delete</DsButton>
<DsModal
  title="Confirm deletion"
  content={<DsParagraph>This action cannot be undone.</DsParagraph>}
  isModalOpen={open}
  onClose={() => setOpen(false)}
  onCancel={() => setOpen(false)}
  onConfirm={handleDelete}
  confirmBtnText="Delete"
  cancelBtnText="Cancel"
/>
```

### Responsive grid
```tsx
<DsContainer>
  <DsGridLayout rows="repeat(3, auto)" gap="md">
    <DsGridElement grid={{ row: '1', col: '1 / -1' }}>
      <DsHeading type="heading-2">Dashboard</DsHeading>
    </DsGridElement>
    <DsGridElement><DsCard elevation={1}>Metric A</DsCard></DsGridElement>
    <DsGridElement><DsCard elevation={1}>Metric B</DsCard></DsGridElement>
    <DsGridElement><DsCard elevation={1}>Metric C</DsCard></DsGridElement>
  </DsGridLayout>
</DsContainer>
```
