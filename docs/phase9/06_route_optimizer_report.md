# Step 9.6: Route Optimizer & Map / SVG Verification Report

**Branch:** `phase9/step-9.6`  
**Commit:** Pending (Step 9.6 verification complete)  
**Status:** PASS  
**Auditor:** Lead Product Designer & Frontend Engineer  
**Date:** 2026-10-22  

---

## 1. Scope & Implementation Summary

In Step 9.6, we implemented the dispatcher-grade **Route Optimizer** page (`frontend/src/pages/RouteOptimizer.tsx`) replacing legacy visual mocks with an audited, deterministic routing desk:

1. **MapLibre GL Vector Map with Deterministic SVG Stop Plot Fallback:**
   - Vector basemap rendered with CARTO Positron Light / Dark basemaps via MapLibre GL v5.
   - Built-in automatic capability detection for WebGL environments. If WebGL is unavailable or in offline/headless scenarios, automatically degrades to an offline-safe SVG Stop Plot.
   - Toggle button allows manual switching between vector map and deterministic SVG stop plot at any time.

2. **Sequential Dispatch Modes:**
   - **Manifest Order (28.59 km):** Raw uploaded order as received in the pre-dispatch manifest.
   - **Risk-First Order (28.59 km):** Prioritizes highest failure probability shipments first for early delivery attempts.
   - **2-Opt TSP Optimized (8.89 km):** Deterministic 2-Opt TSP heuristic executing in < 50ms with circuity-scaled Haversine distances ($\kappa = 1.35$), achieving **-68.9% travel distance reduction**.

3. **Tour Topology & What-If Controls:**
   - **Open Tour vs. Closed Tour (Depot Return):** Adds depot return leg (8.89 km open vs 10.95 km closed).
   - **What-If Deferral (30 → 25 stops):** Evaluates route compression and savings when the 5 highest-risk stops are deferred under fleet capacity policies.

4. **Audited Release Benchmarks Display:**
   - Created `frontend/src/data/release_report_v1_5_0.ts` importing verbatim metrics from `docs/FINAL_RELEASE_REPORT.md`.
   - Side-by-side comparison table against standard baseline sequences (Random 29.5 km, Manifest 28.6 km, Risk-Sorted 27.9 km).

5. **Accessibility & Contrast Hardening:**
   - Adjusted `:root` `--risk-low` token to `#1E6B47` ensuring $\ge 4.5:1$ contrast against light sunken backgrounds (`#EDF0F3`, `#E6F2EB`).
   - Removed `opacity-90` from numerical probability display in `Badge.tsx`.
   - Added keyboard focusability (`tabIndex={0}` and `aria-label`) to scrollable stop sequences for full WCAG 2.1 AA compliance.

---

## 2. Automated Verification Results

| Check / Metric | Target | Result | Status |
| :--- | :--- | :--- | :--- |
| **Route Optimizer Load Time** | < 1,500 ms | **1,009 ms** | PASS |
| **Axe Accessibility Scan (WCAG 2.1 AA)** | 0 critical / 0 serious | **0 violations** | PASS |
| **Map & SVG Fallback Verification** | Polyline rendered | **Verified** | PASS |
| **2-Opt Distance Reduction** | > 60% savings | **-68.9% (8.89 km vs 28.59 km)** | PASS |
| **Solver Latency** | < 100 ms | **50 ms** | PASS |
| **Database Hash Integrity** | `E4043B69477...` | **Identical (Unchanged)** | PASS |
| **Pytest Suite** | 99 passed | **99 passed, 0 failed** | PASS |

---

## 3. Visual Artifacts Captured

- **Light Mode Desktop:** `docs/phase9/screenshots/route_optimizer_desktop_light.png`
- **Dark Mode Desktop:** `docs/phase9/screenshots/route_optimizer_desktop_dark.png`
- **SVG Stop Plot Fallback:** `docs/phase9/screenshots/route_optimizer_svg_fallback.png`

---

## 4. Open Issues / Notes

- CARTO Positron basemap tiles require internet access; in offline testing environments, the map cleanly and deterministically falls back to the SVG Stop Plot without throwing unhandled exceptions.
