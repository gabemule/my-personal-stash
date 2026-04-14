# @akad/design-system — Themes

## Available themes

| Theme | Brand | Primary color |
|---|---|---|
| `default` | AkaDS default | `#e3175e` (pink-red) |
| `aon` | AON | `#e80300` (red) |
| `bees` | Bees Bank | gradient (yellow→cyan) |
| `bmc` | BMC | `#f5f5f5` / `#ffb81c` (yellow accent) |
| `linker` | Linker | `#ff6d5c` (coral) |
| `oggi` | Oggi | `#86c440` (green) |
| `streetgo` | StreetGo | `#e4ff00` (neon yellow) |

All themes share the same **neutral scale** and **semantic colors** unless overridden.

---

## CSS import (pick one theme per project)

```js
// In your app entry point (e.g. main.tsx / App.tsx)
import '@akad/design-system/css/theme-default.css';
import '@akad/design-system/css/theme-aon.css';
import '@akad/design-system/css/theme-bees.css';
import '@akad/design-system/css/theme-bmc.css';
import '@akad/design-system/css/theme-linker.css';
import '@akad/design-system/css/theme-oggi.css';
import '@akad/design-system/css/theme-streetgo.css';
```

---

## ThemeProvider component

```tsx
import { DsThemeProvider } from '@akad/design-system/react';
import '@akad/design-system/css/theme-bees.css';

function App() {
  return (
    <DsThemeProvider theme="light" library="core">
      {/* your app */}
    </DsThemeProvider>
  );
}
```

**Props:**
- `theme`: `'light'` | `'dark'` (default: `'light'`)
- `library`: `'core'` | `'mkt'` (default: `'core'`)
- `children`: required

Renders as `<div data-library="core" data-theme="light"><div class="ds-theme">...</div></div>`

---

## Data-attribute approach (without ThemeProvider)

Apply directly to the root element for more control:

```html
<div data-library="core" data-theme="light">
  <div class="ds-theme">
    <!-- app content -->
  </div>
</div>
```

---

## Dark / light mode toggle (React)

```tsx
import { useState } from 'react';
import { DsThemeProvider, DsButton } from '@akad/design-system/react';
import '@akad/design-system/css/theme-default.css';

export function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  return (
    <DsThemeProvider theme={theme} library="core">
      <DsButton
        variant="outline"
        color="secondary"
        onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
      >
        {theme === 'light' ? 'Switch to Dark' : 'Switch to Light'}
      </DsButton>
      {/* rest of app */}
    </DsThemeProvider>
  );
}
```

---

## Color palettes by theme

### default
| Role | Variable | Hex |
|---|---|---|
| Primary | `$color__primary` | `#e3175e` |
| Primary dark | `$color__primary--dark` | `#b2003f` |
| Primary darker | `$color__primary--darker` | `#720028` |
| Primary light | `$color__primary--light` | `#faaec9` |
| Primary lighter | `$color__primary--lighter` | `#ffd9e6` |
| Primary lightest | `$color__primary--lightest` | `#ffebf1` |
| Secondary | `$color__secondary` | `#1c4173` |
| Secondary dark | `$color__secondary--dark` | `#062854` |
| Secondary darker | `$color__secondary--darker` | `#001d40` |
| Secondary light | `$color__secondary--light` | `#7c97b8` |
| Secondary lighter | `$color__secondary--lighter` | `#dee7f1` |
| Secondary lightest | `$color__secondary--lightest` | `#ebf1f7` |
| Success | `$color__success` | `#70c24a` |
| Warning | `$color__warning` | `#e6a100` |
| Danger | `$color__danger` | `#e01b1b` |
| Info | `$color__info` | `#0044cc` |

### aon
| Role | Hex |
|---|---|
| Primary | `#e80300` |
| Primary dark | `#cc1311` |
| Primary darker | `#b2100d` |
| Secondary | `#262836` |
| Secondary dark | `#1d1e26` |
| Success | `#bde094` |
| Warning | `#ffc766` |
| Danger | `#fa5254` |
| Info | `#7040ff` |

### bees
| Role | Hex / value |
|---|---|
| Primary | gradient `#ff0` → `#55fffe` |
| Primary dark | `#ecff1c` |
| Primary darker | `#8e9911` |
| Secondary | inherits from default |
| Semantic colors | inherit from default |

### bmc
| Role | Hex |
|---|---|
| Primary | `#f5f5f5` |
| Primary darker | `#ffb81c` (yellow accent) |
| Primary dark | `#000000` |
| Secondary | `#262836` |
| Success | `#bde094` |
| Warning | `#ffc766` |
| Danger | `#fa5254` |
| Info | `#7040ff` |

### linker
| Role | Hex |
|---|---|
| Primary | `#ff6d5c` |
| Primary dark | `#cc574a` |
| Primary darker | `#ad4a3d` |
| Secondary | `#000000` |
| Semantic colors | inherit from default |

### oggi
| Role | Hex |
|---|---|
| Primary | `#86c440` |
| Primary dark | `#000000` |
| Primary darker | `#4d880a` |
| Secondary | `#262836` |
| Success | `#bde094` |
| Warning | `#ffc766` |
| Danger | `#fa5254` |
| Info | `#7040ff` |

### streetgo
| Role | Hex |
|---|---|
| Primary | `#e4ff00` (neon yellow) |
| Primary dark | `#000000` |
| Primary darker | `#4d880a` |
| Secondary | `#262836` |
| Success | `#bde094` |
| Warning | `#ffc766` |
| Danger | `#fa5254` |
| Info | `#7040ff` |

---

## Neutral scale (shared across all themes)

| Variable | Hex |
|---|---|
| `$color__neutral--00` | `#ffffff` |
| `$color__neutral--05` | `#fafafa` |
| `$color__neutral--10` | `#f5f5f5` |
| `$color__neutral--20` | `#eeeeee` |
| `$color__neutral--30` | `#e0e0e0` |
| `$color__neutral--40` | `#bdbdbd` |
| `$color__neutral--50` | `#9e9e9e` |
| `$color__neutral--60` | `#757575` |
| `$color__neutral--70` | `#616161` |
| `$color__neutral--80` | `#424242` |
| `$color__neutral--90` | `#212121` |
| `$color__neutral--100` | `#1f1b1c` |
