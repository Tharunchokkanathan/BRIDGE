# Step 9.2 Report: App Shell and Navigation ("Dispatch Desk")

## 1. Executive Summary
Step 9.2 builds the core application shell, responsive navigation rail, top header bar, global command palette (`Ctrl+K`), toast notification system, error boundary, and typed API client layer for BRIDGE Phase 9. All 10 operational screens are wired with deep-linkable URL routing, live API health telemetry, model hot-swap status, and local storage state persistence.

---

## 2. Deliverables & What Changed
1. **Application Shell (`frontend/src/components/layout/AppShell.tsx`)**:
   - Master layout container enforcing zero layout shift, neutral surfaces (`--canvas`), hairline borders (`--border`), and responsive breakpoint adaptations.
   - Global keyboard shortcuts listener (`[` for rail toggle, `?` for shortcut sheet, `Alt+1..9` for direct screen navigation, `Esc` for modal dismiss).
   - LocalStorage persistence for user preferences: `bridge_theme` (light/dark), `bridge_density` (compact/default/comfortable), and `bridge_nav_collapsed` (boolean).
2. **Responsive Collapsible Navigation Rail (`frontend/src/components/layout/NavRail.tsx`)**:
   - Expanded state: 224px width with brand badge, monochromatic Tabler icons, screen labels, and collapse shortcut indicator.
   - Collapsed state: 56px icon-only rail with tooltips.
   - All 10 screens represented:
     * Command Center (`/command-center` or `/`)
     * Risk Queue (`/risk-queue`)
     * Route Optimizer (`/route-optimizer`)
     * Interventions (`/interventions`)
     * Zone Priors (`/zone-priors`)
     * Batch Scoring (`/batch-scoring`)
     * Model Governance (`/model-governance`)
     * Audit and Disclosures (`/audit`)
     * Settings (`/settings`)
     * Styleguide (`/styleguide`)
3. **Top Header Bar (`frontend/src/components/layout/TopBar.tsx`)**:
   - Fixed 48px height with hairline bottom divider.
   - Active route context chip (`Route_01 · 30 stops`) and manifest ID indicator.
   - Global command palette search bar trigger with `Ctrl+K` keycap.
   - Live Model Status Badge: binds to active inference model (`Champion LR` or `Candidate LightGBM`), clickable to navigate to Model Governance.
   - Live API Health Indicator: binds to `/api/health` with online/offline dot and latency readout.
   - Tri-state density toggle (`compact`, `default`, `comfortable`).
   - Theme switcher (Light / Dark).
   - Release version chip (`v1.6.0`).
4. **Global Command Palette (`frontend/src/components/layout/CommandPalette.tsx`)**:
   - Built with `cmdk` library, styled to Dispatch Desk design tokens (hairline 1px border, 8px radius, no neon).
   - Fast keyboard navigation across screens, quick hot-swap model actions, manifest reset, and view preferences.
5. **Typed API Client Layer (`frontend/src/api/client.ts` & `frontend/src/api/types.ts`)**:
   - Resilient Zod schemas for all endpoints (`HealthResponse`, `DashboardStats`, `ShipmentListResponse`, `RouteOptimizeResponse`, `ModelSwitchResponse`).
   - Single typed `ApiError` class with HTTP status code and message.
   - Support for `X-API-Key` headers when configured.
6. **Error Boundary & Toast System**:
   - `ErrorBoundary.tsx`: Catches rendering exceptions with structured error details and "Reload Screen" action.
   - `ToastProvider.tsx`: Sonner toast notifications styled with 1px hairline borders and IBM Plex typography.
   - `ApiDownBanner.tsx`: Calm, non-flashing alert banner with "Retry Connection" action when API is unreachable.
7. **Playwright Automation Script (`scripts/verify_shell.js`)**:
   - Programmatically tests shell loading, keyboard navigation, nav collapse, Ctrl+K dialog, theme toggle, and captures HiDPI screenshots across viewports.

---

## 3. Playwright Verification Results

Ran `node scripts/verify_shell.js`:
```text
Launching headless Chromium...
Navigating to http://localhost:5173/...
Page title: BRIDGE · Dispatch Desk
✓ Captured Desktop Light Mode: docs/phase9/screenshots/shell_desktop_light.png
Pressing [ to collapse nav rail...
✓ Captured Collapsed Nav Rail: docs/phase9/screenshots/shell_nav_collapsed.png
Triggering Command Palette via Ctrl+K...
✓ Captured Command Palette Overlay: docs/phase9/screenshots/shell_cmd_palette.png
Toggling theme to Dark Mode...
✓ Captured Desktop Dark Mode: docs/phase9/screenshots/shell_desktop_dark.png
Switching to Tablet viewport (834x1112)...
✓ Captured Tablet Viewport: docs/phase9/screenshots/shell_tablet.png
Switching to Mobile viewport (390x844)...
✓ Captured Mobile Viewport: docs/phase9/screenshots/shell_mobile.png

All Step 9.2 Playwright verification tests passed successfully!
```

---

## 4. Captured Visual Evidence

- **Desktop Light Mode (1440x900 HiDPI)**:
  `docs/phase9/screenshots/shell_desktop_light.png`
- **Desktop Dark Mode (1440x900 HiDPI)**:
  `docs/phase9/screenshots/shell_desktop_dark.png`
- **Nav Rail Collapsed Mode (56px)**:
  `docs/phase9/screenshots/shell_nav_collapsed.png`
- **Command Palette Overlay (Ctrl+K)**:
  `docs/phase9/screenshots/shell_cmd_palette.png`
- **Tablet Viewport (834x1112)**:
  `docs/phase9/screenshots/shell_tablet.png`
- **Mobile Viewport (390x844)**:
  `docs/phase9/screenshots/shell_mobile.png`

---

## 5. Non-Regression & Hard Constraint Verification

1. **Model Artifacts & Database Integrity**:
   - `data/bridge_local.db`: SHA-256 `E4043B69477DEF750CF27EAC19332FB8925419A45BCB7F384B509E7E3D34DA81` (100% Identical)
   - All 10 model binary hashes verified identical before and after.
2. **Backend Automated Tests**:
   - `pytest -q`: 97 passed, 0 failed in 128s.
3. **No Fabricated Data**:
   - TopBar and CommandCenter bind directly to live `/api/health` and `/api/dashboard/stats`.
4. **Audit Guardrails**:
   - Preserved all required Phase 5.1/6 audit badges in UI (`Haversine κ=1.35`, `Rule-based heuristic`, `Preview only`, `Counterfactual simulation`).

---

## 6. Open Issues & Notes
- Ready for Step 9.3: Component Primitives.
