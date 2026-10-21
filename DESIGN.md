# BRIDGE Design System: "Dispatch Desk"

## 1. Overview & Philosophy
"Dispatch Desk" is an operations-grade, human-crafted instrument panel designed for logistics dispatchers and operations managers under time pressure. It rejects generic "AI-generated" aesthetics (such as purple gradients, floating cards, shadow soup, and ungrounded KPI tiles) in favor of quiet surfaces, hairline borders, tabular numeric discipline, and purposeful, colorblind-safe semantic indicators.

---

## 2. Typography

### 2.1 Font Families
- **Interface & Prose:** `IBM Plex Sans`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `sans-serif`
  - Weights: `400` (Regular), `500` (Medium), `600` (SemiBold)
- **Identifiers, Code, & Metrics:** `IBM Plex Mono`, `ui-monospace`, `SFMono-Regular`, `Menlo`, `Monaco`, `monospace`
  - Weights: `400` (Regular), `500` (Medium)
  - Features: Always rendered with `font-variant-numeric: tabular-nums` to ensure stable vertical alignment in lists and tables.

### 2.2 Type Scale & Line Heights
| Token | Size | Line Height | Weight | Tracking | Primary Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `text-caption` | 11px (0.6875rem) | 14px (0.875rem) | 400 / 500 | +0.01em | Table footers, mono metadata, badge labels |
| `text-secondary` | 12px (0.75rem) | 16px (1.0rem) | 400 / 500 | 0 | Table cells, secondary status, helper labels |
| `text-body` | 13px (0.8125rem) | 18px (1.125rem) | 400 / 500 | 0 | Default body text, button labels, form inputs |
| `text-section` | 14px (0.875rem) | 20px (1.25rem) | 500 / 600 | -0.01em | Section headers, card titles, drawer headers |
| `text-title` | 16px (1.0rem) | 22px (1.375rem) | 500 / 600 | -0.01em | Panel titles, modal headings |
| `text-display` | 20px (1.25rem) | 26px (1.625rem) | 600 | -0.02em | Page title, lead KPI values |
| `text-hero` | 28px (1.75rem) | 34px (2.125rem) | 600 | -0.02em | Lead operational percentage (e.g., "97.4%") |

---

## 3. Color Tokens & Contrast Specifications

### 3.1 Theme Tokens

#### Light Theme (Default, Projector & Daylight Optimized)
| CSS Variable | Hex | Description | Min WCAG AA Context |
| :--- | :--- | :--- | :--- |
| `--canvas` | `#F3F5F7` | Background canvas of application window | Base |
| `--surface` | `#FFFFFF` | Primary content panels, tables, cards | Base |
| `--surface-muted` | `#F8F9FA` | Secondary panel backgrounds, table hover | Background |
| `--surface-sunken` | `#EDF0F3` | Input background, inactive tab strip | Background |
| `--border` | `#D9DEE3` | Hairline structural borders (1px) | Graphical (>= 3.0:1) |
| `--border-strong` | `#C3CAD1` | Active borders, divider lines | Graphical (>= 3.0:1) |
| `--ink` | `#14181C` | Primary text and headings | Text on Surface (15.5:1) |
| `--ink-muted` | `#5B6670` | Secondary text, field labels, metadata | Text on Surface (5.3:1) |
| `--ink-faint` | `#8A949E` | Disabled text, icons, non-critical units | Non-critical / Aux (3.0:1) |
| `--accent` | `#0B5E73` | Deep Slate Cyan for primary actions, focus | Text on Surface (6.9:1) |
| `--accent-hover` | `#084A5B` | Hover state for accent buttons | Interactive |
| `--accent-subtle` | `#E3F0F3` | Active navigation background, selection | Background |
| `--focus-ring` | `#0B5E73` | Keyboard focus ring outline | Accessibility (>= 3.0:1) |
| `--risk-low` | `#2F7D57` | Low risk indicator text and icon | Text on White (4.8:1) |
| `--risk-low-bg` | `#E6F2EB` | Low risk badge background tint | Container |
| `--risk-med` | `#9A6700` | Medium risk indicator text and icon | Text on White (4.6:1) |
| `--risk-med-bg` | `#FBF1D9` | Medium risk badge background tint | Container |
| `--risk-high` | `#B42318` | High risk indicator text and icon | Text on White (5.8:1) |
| `--risk-high-bg` | `#FBE9E7` | High risk badge background tint | Container |
| `--info` | `#1F5FA8` | Informational status and notices | Text on White (6.2:1) |
| `--info-bg` | `#E6EFF9` | Informational banner background | Container |

#### Dark Theme (Night Operations & Low-Glare Dispatch)
| CSS Variable | Hex | Description | Min WCAG AA Context |
| :--- | :--- | :--- | :--- |
| `--canvas` | `#0E1215` | Window backdrop | Base |
| `--surface` | `#151A1F` | Primary panel surface | Base |
| `--surface-muted` | `#1A2026` | Secondary panels, table row hover | Background |
| `--surface-sunken` | `#0A0D10` | Input wells, recessed tracks | Background |
| `--border` | `#2A323A` | Hairline structural borders (1px) | Graphical (>= 3.0:1) |
| `--border-strong` | `#3A444E` | Focus indicators, selected dividers | Graphical (>= 3.0:1) |
| `--ink` | `#E6EAED` | Primary high-contrast text | Text on Surface (13.6:1) |
| `--ink-muted` | `#9AA5AF` | Secondary labels, descriptions | Text on Surface (6.8:1) |
| `--ink-faint` | `#6E7A85` | Inactive tabs, disabled markers | Graphical (>= 3.0:1) |
| `--accent` | `#4FB3C8` | Electric Cyan for focus, buttons, active | Text on Surface (6.6:1) |
| `--accent-hover` | `#7CC8D8` | Hover state for accent buttons | Interactive |
| `--accent-subtle` | `#12303A` | Active row highlight, active nav | Background |
| `--focus-ring` | `#7CC8D8` | High-visibility focus ring outline | Accessibility (>= 3.0:1) |
| `--risk-low` | `#5BBF8A` | Low risk text / icon glyph | Text on Surface (7.0:1) |
| `--risk-low-bg` | `rgba(91, 191, 138, 0.14)` | Low risk badge background | Container |
| `--risk-med` | `#E0A33A` | Medium risk text / icon glyph | Text on Surface (6.7:1) |
| `--risk-med-bg` | `rgba(224, 163, 58, 0.14)` | Medium risk badge background | Container |
| `--risk-high` | `#F07167` | High risk text / icon glyph | Text on Surface (5.3:1) |
| `--risk-high-bg` | `rgba(240, 113, 103, 0.14)` | High risk badge background | Container |
| `--info` | `#589BD6` | Informational status text | Text on Surface (6.2:1) |
| `--info-bg` | `rgba(88, 155, 214, 0.14)` | Informational banner background | Container |

### 3.2 Categorical Chart Palette (Colorblind-Safe)
Charts must **never** reuse `--accent` and must remain distinguishable under protanopia, deuteranopia, and tritanopia:
- Series 1 (Blue): `#2B6CB0`
- Series 2 (Teal): `#319795`
- Series 3 (Gold): `#D69E2E`
- Series 4 (Purple-Gray): `#553C9A`
- Series 5 (Slate): `#4A5568`

### 3.3 Semantic Rules for Color Usage
1. **Accent Exclusivity:** `--accent` is strictly reserved for primary call-to-action buttons, active navigation markers, interactive links, and focused input outlines. It must never be applied decoratively or on informational chips.
2. **Risk Meaning:** Risk colors (`--risk-low`, `--risk-med`, `--risk-high`) are reserved exclusively for failure risk assessment.
3. **Multi-Sensory Risk Encoding:** Color is never used alone to convey risk. Every risk indicator must include:
   - Text label: `Low`, `Medium`, or `High`
   - Numeric score: Calibrated probability in `IBM Plex Mono` (e.g. `0.245`)
   - Distinct shape glyph:
     - `●` (Circle / check) for Low Risk
     - `▲` (Triangle / warning) for Medium Risk
     - `■` (Square / alert) for High Risk

---

## 4. Spacing & Grid System

### 4.1 Base Unit: 4px Grid
All margins, paddings, gaps, and component heights adhere to multiples of 4px:
- `space-0`: 0px
- `space-1`: 4px
- `space-2`: 8px
- `space-3`: 12px
- `space-4`: 16px
- `space-6`: 24px
- `space-8`: 32px
- `space-12`: 48px
- `space-16`: 64px

### 4.2 Application Layout Dimensions
- **Left Navigation Rail:** `224px` expanded, `56px` collapsed (icon-only mode).
- **Top Header Bar:** `48px` fixed height.
- **Maximum Content Width:** `1600px` centered on ultra-wide viewports.
- **Page Gutters:**
  - Desktop (>= 1280px): `24px`
  - Tablet (768px - 1023px): `16px`
  - Mobile (< 768px): `12px`
- **Internal Panel Padding:** `16px` standard, `12px` compact.
- **Panel Separation Gap:** `16px`.

---

## 5. Shape, Borders & Elevation

### 5.1 Border Radii
- `rounded-xs` (2px): Table input cells, compact badge pills, mono status chips.
- `rounded-sm` (4px): Standard buttons, form text inputs, select dropdowns.
- `rounded-md` (6px): Main operational panels, cards, slide-over drawers.
- `rounded-lg` (8px): Modal dialogs, system alerts.
- *Strict Rule:* No border radius larger than 8px anywhere in the design. No pill-shaped inputs or oversized pill buttons.

### 5.2 Hairline Borders & Elevation Discipline
- **Flat Surface Hierarchy:** Structural panels, cards, tables, and buttons use **1px hairline borders** (`--border`) with zero box-shadow. No soft drop shadows or multi-layered card blur effects.
- **Restricted Shadows:** Drop shadows are permitted **only** on floating, elevated viewport overlays:
  - Dropdown Menus & Popovers: `box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);`
  - Modals & Drawers: `box-shadow: 0 12px 32px rgba(0, 0, 0, 0.16);`

---

## 6. Motion & Animation Tokens

### 6.1 Principles
1. **Zero Decorative Motion:** No entrance fades, fly-in animations, parallax, bounce physics, or looping pulses.
2. **Micro-Interactions Only:** Transitions are applied solely to communicate state changes (row selection, drawer open/close, tab switching, hover highlight).
3. **Data Flash:** Real-time data value updates trigger a brief 400ms background highlight (`--accent-subtle`) that immediately fades out.

### 6.2 Motion Specs
- **Duration:** `120ms` to `150ms` (maximum 150ms for UI controls; 180ms for large modal transitions).
- **Easing:** `cubic-bezier(0.2, 0.0, 0.0, 1.0)` (standard decay).
- **Accessibility:** Strictly enforced `@media (prefers-reduced-motion: reduce)` resets all transitions and animations to `0ms`.

---

## 7. Table & Data Grid Geometry
- **Table Header Height:** `32px` with uppercase muted 11px mono labels.
- **Row Densities:**
  - Compact: `32px` row height (8px vertical padding).
  - Default: `40px` row height (10px vertical padding).
  - Comfortable: `48px` row height (12px vertical padding).
- **Styling Rules:**
  - Hairline horizontal dividers (`1px solid var(--border)`).
  - Alternating zebra striping is **disabled**.
  - Row hover uses `--surface-muted`.
  - Selected row uses `--accent-subtle`.
  - Numeric columns (probabilities, costs, lat/lon, sequences) are **always right-aligned** in `IBM Plex Mono`.
