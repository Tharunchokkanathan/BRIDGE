# Anti-"Vibe-Coded" Design Checklist (AI Tells Audit)

This checklist enforces the human-designed, dispatcher-grade aesthetic of the BRIDGE "Dispatch Desk". It serves as an active enforcement tool during development and as a formal audit gate during Step 9.10.

---

## 1. P0 Violations (Zero Tolerance — Immediate Build / Review Failure)

| Item Code | Banned AI Pattern | Required Human-Crafted Alternative | Status |
| :--- | :--- | :--- | :--- |
| **P0-01** | **Purple / Indigo / Violet Gradients** (the classic AI SaaS tell) | Muted neutral surfaces (`#FFFFFF`, `#151A1F`) with a single deep Slate Cyan accent (`#0B5E73` / `#4FB3C8`). | Passed |
| **P0-02** | **Inter Font Everywhere** | Custom typography: `IBM Plex Sans` for UI text + `IBM Plex Mono` for tabular metrics and identifiers. | Passed |
| **P0-03** | **Gradient Text** (`bg-clip-text text-transparent`) | High-contrast, solid ink values (`--ink`, `--ink-muted`). Zero gradient lettering. | Passed |
| **P0-04** | **Glassmorphism / Backdrop Blur Panels** | Solid, opaque surfaces with 1px hairline borders (`--border`). | Passed |
| **P0-05** | **Glowing Neon Drop Shadows on Dark Mode** | Clean, flat dark surfaces with subtle structural borders (`#2A323A`). | Passed |
| **P0-06** | **Colored Left-Border Accent Cards** | Semantic badges with icon + text + numeric probability; no full-card border color coding. | Passed |
| **P0-07** | **Identical 3-Card KPI Row with Tinted Circular Icons** | Compact 4-metric flat tabular strip separated by 1px hairline vertical dividers. | Passed |
| **P0-08** | **Emoji or Emoji Icons in Operational UI** | Tabler SVG icons (`@tabler/icons-react`) with consistent 1.25px stroke weight; zero emojis. | Passed |
| **P0-09** | **Pulsing "Live" Badges & Status Dots on Everything** | Static, unambiguous status chips with clear text states; zero infinite pulsing keyframes. | Passed |
| **P0-10** | **Giant Border Radii (> 8px) & Oversized Pill Badges** | Strict max 8px radius on modals, 4px on controls, 2px on table cells. | Passed |
| **P0-11** | **Soft Drop-Shadow Soup on Every Card** | Zero box-shadows on flat panels. Shadows restricted strictly to floating popovers & dialogs. | Passed |
| **P0-12** | **Centered Marketing Hero Layouts** | Dense, left-aligned operational layout optimized for data density and quick scanning. | Passed |
| **P0-13** | **Bouncy Spring Easing & Entrance Animations** | Max 150ms linear/cubic-bezier(0.2, 0, 0, 1) micro-transitions only. Zero page-load entrance fly-ins. | Passed |
| **P0-14** | **Decorative Sparklines with No Axes or Values** | Functional, labeled histograms and charts with clear quantitative axis ticks. | Passed |
| **P0-15** | **Rainbow-Colored Navigation Sidebar Icons** | Monochromatic navigation icons using `--ink-muted` with `--accent` active indicator. | Passed |
| **P0-16** | **Fabricated / Random Mock Data & Superlatives** | 100% grounded data: live API payloads or explicit `release_report_v1_5_0.ts`. No "AI-powered" hype text. | Passed |

---

## 2. P1 Human Craft & Usability Rules (Must be Fully Implemented or Documented)

| Item Code | Human Craft Requirement | Implementation Standard |
| :--- | :--- | :--- |
| **P1-01** | **Real Hierarchy via Typography & Whitespace** | Differentiate sections using type weight, size, and 4px grid spacing instead of nesting nested boxes. |
| **P1-02** | **Tabular Numerals** | All numeric metrics, IDs, latitudes, longitudes, and probabilities use `font-variant-numeric: tabular-nums`. |
| **P1-03** | **Colorblind-Safe Semantic Multi-Encoding** | Risk states combine color + text label (Low/Med/High) + geometric shape glyph (● / ▲ / ■). |
| **P1-04** | **Complete State Coverage** | Every component and view implements Default, Empty, Loading, Error, and Disabled states. |
| **P1-05** | **Actionable Alerts** | Every alert banner or error toast includes an explicit remediation action button (Retry, Reset, Defer). |
| **P1-06** | **Respect User Preferences** | Respects `prefers-reduced-motion` and OS system color scheme. |
| **P1-07** | **Explicit Audit Guardrails** | Preserves all Phase 5.1/6 audit badges (Counterfactual simulation, Heuristic, Preview-only, Haversine $\kappa=1.35$). |
