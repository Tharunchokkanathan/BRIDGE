# BRIDGE Phase 9 — Preflight Audit & Frontend Architecture Decision Gate

**Audit Timestamp:** October 21, 2026  
**Auditor:** Lead Product Designer & Frontend Systems Engineer  
**Git Branch:** `phase9/step-9.0` (branched from `main` commit `e599873`)

---

## 1. Preflight Verification & Integrity Hashes

### 1.1 Git Status & Test Integrity
* **Active Branch:** `phase9/step-9.0`
* **Test Suite Status:** 97 tests collected, core baseline test suites pass with zero regressions (`tests/test_api.py`, `tests/test_engine.py`, `tests/test_model_candidate.py`, `tests/test_calibration.py`, `tests/test_interventions.py`, `tests/test_routes.py`, `tests/test_frontend_contracts.py`, `tests/test_saas_api.py`, and `tests/test_benchmarks.py`).
* **Test Database Isolation:** Confirmed via `conftest.py`; test executions run in isolated temporary SQLite databases without touching repository data.

### 1.2 Model Artifacts & Database Checksums (SHA-256)
Strict hard constraint: Backend, ML models, and data artifacts are read-only.

| Artifact File | SHA-256 Hash | Status |
| :--- | :--- | :---: |
| `data/bridge_local.db` | `E4043B69477DEF750CF27EAC19332FB8925419A45BCB7F384B509E7E3D34DA81` | **LOCKED** |
| `models/champion_model.joblib` | `BA2D511ADF7A89921B925961C5D3540D52CF25BC38419967FA3FAE00BE8E1B97` | **LOCKED** |
| `models/logistic_regression.joblib` | `BA2D511ADF7A89921B925961C5D3540D52CF25BC38419967FA3FAE00BE8E1B97` | **LOCKED** |
| `models/lightgbm_candidate.joblib` | `F489D13862C1E479F4819751DE495D056D6EFF8B0CE89A4C63BBA8415D0D2B87` | **LOCKED** |
| `models/random_forest.joblib` | `66F304413AEE8DDE3343CE734104FE8397CD0E3705519D550DE413C65395B5D8` | **LOCKED** |
| `models/preprocessor.joblib` | `2BEBCFF23DC8BAAA85F16729696E5CF5AB013285773ED9379CD98BFB921E0EF7` | **LOCKED** |
| `models/scaled_preprocessor.joblib` | `4FD148D00DD8426FCFE3FD5E3542A51490414BBA9BC07A10D7BC3DE1081A7A1F` | **LOCKED** |
| `models/calibrator_champion.joblib` | `187427C8BBF5F8E001C3494CC573C3BA5CD998983483D3B21B26F4E700307D2C` | **LOCKED** |
| `models/calibrator_candidate.joblib` | `459DCBA80B60A0D89EB7D3A6BDA1E75B76ECE68B66BBE0F503510A7916AABB69` | **LOCKED** |
| `models/background_mean_champion.joblib` | `308EABB5F9128890B2D1CCA280310FEBB38D900EE898DA19BC740944CBE5267C` | **LOCKED** |
| `models/model_metadata.json` | `AA991D98CF2D426AD84BFB3BDAE1E21C970159F07566D4B34FDDBE225888992A` | **LOCKED** |

---

## 2. Existing Frontend Inventory & Serving Architecture

### 2.1 Currently Mounted Production UI (`static/`)
FastAPI currently mounts `static/` at the root path (`/`):
```python
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static")
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
```
* **Architecture:** Vanilla Single-Page Application (HTML5, vanilla CSS, vanilla ES6 JavaScript).
* **Key Files:**
  - `static/index.html` (27.8 KB, 483 lines): Static HTML container with tab panels (`#dispatcher-view`, `#route-view`, `#customer-view`, `#audit-view`), modals for intervention simulation and messaging preview.
  - `static/css/style.css` (21.6 KB, 846 lines): Custom CSS styling featuring dark-mode glows, card grids, table styling, and badge classes.
  - `static/js/app.js` (30.5 KB, 684 lines): Vanilla imperative DOM manipulation managing API fetching, table rendering, tab switching, and Leaflet map rendering.
* **CORS Settings:** Configured via FastAPI `CORSMiddleware` permitting all origins (`allow_origins=["*"]`), credentials, methods, and headers.
* **CSP:** None explicitly enforced in HTTP headers; standard browser default policy.

### 2.2 Unused Legacy Workspace Starter (`frontend/`)
* Contains a standard default Vite + React starter template generated during Phase 1 project scaffolding (October 10, 2026), never built or integrated with FastAPI.

---

## 3. Baseline Screenshots Inventory

Using Playwright headless Chromium, 12 full-page baseline screenshots were captured covering all four active Phase 6 views across three distinct viewports:
* **Desktop (1440 × 900):**
  - `docs/phase9/baseline/dispatcher_desktop.png`
  - `docs/phase9/baseline/route_desktop.png`
  - `docs/phase9/baseline/interventions_desktop.png`
  - `docs/phase9/baseline/audit_desktop.png`
* **Tablet (834 × 1112):**
  - `docs/phase9/baseline/dispatcher_tablet.png`
  - `docs/phase9/baseline/route_tablet.png`
  - `docs/phase9/baseline/interventions_tablet.png`
  - `docs/phase9/baseline/audit_tablet.png`
* **Mobile (390 × 844):**
  - `docs/phase9/baseline/dispatcher_mobile.png`
  - `docs/phase9/baseline/route_mobile.png`
  - `docs/phase9/baseline/interventions_mobile.png`
  - `docs/phase9/baseline/audit_mobile.png`

---

## 4. Architecture Decision Gate

### 4.1 Evaluation of Alternatives
1. **Option A: Refactor In-Place in `static/` (Vanilla HTML/CSS/JS)**
   - *Pros:* No compilation step required.
   - *Cons:* Extremely fragile state synchronization across 10 distinct screens, drawer panels, interactive command palettes, virtualized tables with 100+ rows, and multi-route filters; high risk of DOM-injection regressions; lacks typed contract validation.
2. **Option B: Modern Component Architecture in `/frontend` (Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui)**
   - *Pros:* Strict compile-time type safety against OpenAPI schemas (Zod); clean declarative component architecture; headless virtualization (`@tanstack/react-virtual`); accessible keyboard navigation (`cmdk`, Radix primitives); MapLibre vector maps; compiles to static bundle in `frontend/dist`.
   - *Cons:* Requires a build step (`pnpm build`).

### 4.2 Decision
**Adopt Option B: Migrate to Vite + React + TypeScript + Tailwind v4 + shadcn/ui in `/frontend`, compiling to `frontend/dist` and served by FastAPI.**

### 4.3 Serving & Production Integration Strategy
* FastAPI's static file mount in `app/server.py` will point to `frontend/dist` when present, falling back to `static/` if not built:
  ```python
  FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
  STATIC_DIR = FRONTEND_DIST if os.path.exists(FRONTEND_DIST) else os.path.join(os.path.dirname(__file__), "..", "static")
  app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
  ```
* In `Dockerfile`, add a multi-stage Node build step compiling `frontend/dist` before the Python runtime stage. The runtime container remains non-root with `libgomp1` and identical port binding.

---

## 5. Technology Standards & Context7 Grounding

Official documentation for all core libraries retrieved via Context7 MCP:
* **Tailwind CSS v4:** Uses `@tailwindcss/vite` plugin in `vite.config.ts`, `@import "tailwindcss";` in CSS, eliminates legacy `tailwind.config.js`.
* **TanStack Table v8:** Headless table state (`useReactTable`, `getCoreRowModel`, `getSortedRowModel`, `getFilteredRowModel`).
* **MapLibre GL JS v5:** Fast WebGL vector map rendering with CARTO basemap tiles and offline SVG stop-plot fallback.
* **Radix UI & cmdk:** Fully accessible, unstyled primitives styled with custom tokens.
* **Fonts:** `@fontsource/ibm-plex-sans` and `@fontsource/ibm-plex-mono` self-hosted (zero runtime CDN dependency).

---

## 6. Preflight Sign-Off
* [x] Baseline test suite executed and documented.
* [x] All 11 model and database artifact SHA-256 hashes computed and locked.
* [x] 12 full-page baseline screenshots saved in `docs/phase9/baseline/`.
* [x] All 18 API endpoints inventoried in `docs/phase9/api_inventory.md`.
* [x] Initial API gaps and degradation rules established in `docs/phase9/api_gaps.md`.
* [x] Architecture decision confirmed: Vite + React + TS in `frontend/`.
