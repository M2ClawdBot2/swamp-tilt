# SCALE.md — single source of truth for world units

**1 world unit = 1 centimeter.** Everything below is in cm unless stated.

| Thing | Value | Notes |
|---|---|---|
| Ball radius | **1.35** (13.5 mm) | Standard pinball is 1-1/16" diameter = 27 mm → r = 13.5 mm. The build prompt said "~10.6 mm"; that is not a real pinball size (21.2 mm ball). Using the real ball. Flagged in Gate 1 report. |
| Ball density | 7.8 g/cm³ (steel) | → mass ≈ 80 g, matches a real ball |
| Playfield width (inner) | ~51 | Side walls at x = ±26.5, 2 cm thick → inner faces ±25.5 |
| Playfield length | ~95 | z = −50.5 (top of arch) to z = +44 (drain wall) |
| Wall height | 3.0 | Glass (invisible ceiling) at y = 3.6 |
| Flipper bat length | ~8.4 (3.3") | capsule halfLen 3.25 + r 0.95 |
| Flipper pivots (L1) | (±11, 1.2, 36) | |
| Inclination | **6.5°** | Applied as gravity along table normal, geometry stays flat |
| Gravity | 981 cm/s² → (0, −974.96, +111.06) | +z is down-field (toward flippers) |
| Physics timestep | **1/240 s**, fixed, accumulator-decoupled from render | |
| Level strata (later) | L1 y=0, L2 y=+40, L3 y=+80 | per build prompt §5 |

Axes: **x** = across playfield (left −, right +), **y** = up (table normal), **z** = down-field (top of table is −z, flippers/drain are +z).

Code mirror of this file: `src/game/scale.ts`. If you change one, change both.
