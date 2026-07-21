# SWAMP TILT — Roadmap to full game

Target: complete three-level 3D pinball shipped as a static bundle at
**ufcr.online/games/pinball** (sample/staging URL on GitHub Pages until DNS is
pointed). This file is the living tracker — checkboxes get flipped as work
lands, notes get added when reality disagrees with the plan. Gate discipline
from the build prompt applies: no phase is "done" without runnable proof.

Status legend: `[ ]` todo · `[x]` done · `[~]` in progress · `[!]` blocked

## Phase 0 — Repo + deploy rail (tonight, first)
- [x] Gate 1 physics feel: CCD, 240 Hz, cradle, post-pass, orbit, both-held,
      0–1 frame latency, cabinet buttons (see Gate 1 report)
- [ ] git init, initial commit, GitHub repo, push
- [ ] Base path `/games/pinball/`
- [ ] GitHub Pages staging deploy (`deploy:pages` script) so every phase ends
      with a clickable build
- [ ] `vercel.json` ready for the real ufcr.online deploy (Sam connects domain)

## Phase 1 — Multilevel traversal (Gate 2)
One continuous physics world, three Y-strata. Ball transitions are physical.
- [ ] L2 (The Reitz, y=+40) authored colliders: narrow field, floor with
      fall-through gaps instead of outlanes, its own flipper pair
- [ ] L3 (The Bench, y=+80) authored colliders: tightest field, ONE flipper
- [ ] Right ramp L1→L2: authored extruded/segmented ramp + habitrail, ball
      carries velocity up it
- [ ] Center ramp L2→L3
- [ ] Falling: L2 gap drops ball physically back to L1; L3 misses fall to L2
- [ ] Camera: per-level framing, 400 ms eased dolly on level change, deadzone
      ball-follow with heavy damping (never hard-locked)
- [ ] Flipper input routes to the flippers of the ball's current level
- [ ] Headless proof: scripted ball does L1→L2→L3→fall→L1 with progress log
- [ ] Video capture of the full traversal

## Phase 2 — Game logic (Gate 4, pulled ahead of asset gen — see note)
Playable, ugly. All rules real.
- [ ] Game state machine: attract → game → ball end → bonus → game over
- [ ] Scoring core + combo/multiplier plumbing, score events bus
- [ ] L1: T-A-B-L-E drop target bank (5 standing targets, knock-down + reset
      coil timing) → lights Recruit
- [ ] L1: flyer spinner on left orbit (spin count decays), preacher loop
      right-orbit ×3 stacking multiplier that resets on drain
- [ ] L1: Recruit Multiball — 3 balls, survive 45 s, add-a-ball scoring
- [ ] L2: B-U-D-G-E-T targets → funding lit
- [ ] L2: bureaucracy bumper cluster — pops that eat the mode timer while the
      ball is inside the cluster (timer ONLY ticks there; prototype, be
      willing to cut per build-prompt §12)
- [ ] L2: filing-cabinet ball lock ×3 → Charter Multiball
- [ ] L2: Denial kickback — missed shot drops to L1 with letters/progress held
- [ ] L3: gavel drop target, precedent spinner, flat 10× scoring
- [ ] L3: lock under gavel → SUMMARY JUDGMENT wizard: all fields live, 6 balls
      (4 on mobile), ends at 1 ball, award = accumulated × levels visited
- [ ] Tilt: nudge (arrows/shake), warning at 2, chomp death at 3
- [ ] Skill shot: plunger with hold-for-power, yard-sign skill target
- [ ] Ball trough / multi-ball manager (spawn, drain accounting, ball save)
- [ ] Headless proof: scripted full game to completion with score log

## Phase 3 — Asset pipeline (Gate 3) `[!]` partially blocked on credentials
`.env` has no RunPod/TRELLIS/FLUX/xAI keys on this machine. The pipeline code
ships and is testable with mocks; the real generation batch runs when Sam
fills `.env`. Until then the game uses authored primitive placeholder props so
nothing downstream waits.
- [ ] `tools/pod.ts` — RunPod start/stop/health, billing guard
- [ ] `tools/gen-assets.ts` — FLUX→TRELLIS batch per §4 prop table, ASSETS.md
      ledger rows, refs/raw/output dirs
- [ ] `tools/postprocess-glb.ts` — decimate to budget, Draco, atlas, center +
      scale to SCALE.md, fail-loudly on budget overrun
- [ ] Authored placeholder props for every §4 prop (boxes/lathes, correct
      dims) wired through `loadProps.ts` so swap-in is a file drop
- [ ] `tools/gen-callouts.ts` — Grok build-time script with human-review
      print-out; committed `callouts.json` starts with hand-written lines
- [!] Real TRELLIS batch + contact sheet — needs RunPod key from Sam
- [!] Grok-generated callout variants — needs XAI key from Sam

## Phase 4 — Cabinet, UI, audio (Gate 5)
- [ ] Full cabinet render: side rails, lockdown bar, plunger, backglass
- [ ] DMD score readout on the backglass (dot-matrix shader/canvas texture)
- [ ] Design tokens: swamp black, hot orange, institutional blue-grey (L2),
      brass (L3) — pinned hexes in one token file
- [ ] Type: condensed display face (backglass/menus) + mono DMD face
- [ ] React overlay: MainMenu, Options (audio/camera/difficulty/reduced
      motion/show-cabinet), HighScores (localStorage), Credits, How to Play,
      Pause, HUD (score, ball, level, mode+timer, multiplier)
- [ ] Attract mode after 20 s idle: high scores, mode names, slow orbit
- [ ] Audio: Howler sprite bank; synthesized placeholder SFX generated by a
      build script (chomp, flipper, bumper, target, launch, tilt, jackpot) —
      real recordings can replace files later
- [ ] Callout playback hooks (reads baked callouts.json)
- [ ] Mobile: touch thirds for flippers, pull-back plunger gesture, shake or
      two-finger-flick nudge, cabinet rails collapse to strips, buttons stay
      visible as the touch targets
- [ ] Gamepad: L1/R1 flippers, A plunger, stick nudge
- [ ] Reduced motion: no shake, softened dolly; visible keyboard focus
- [ ] Copy pass: active voice, sentence case, the bit is bureaucracy not
      opponents

## Phase 5 — Ship (Gate 6)
- [ ] `harness/verify.spec.ts` full suite: boots headless WebGL, no console
      errors, physics steps, ball spawns + responds, all three levels
      reachable via scripted impulse, frame budget <16 ms avg over 300
      frames, per-level screenshots
- [ ] Perf pass: draw-call budget, shadow tuning, mobile fallback (4-ball
      wizard, reduced shadows), 60 fps on mid phone
- [ ] Production build at `/games/pinball/`, deployed to staging URL
- [ ] Vercel deploy checklist for ufcr.online (Sam: connect repo, set
      VITE_BASE_PATH, point domain)

## Notes / decisions log
- 2026-07-20: Roadmap created. Phase order puts game logic (old Gate 4) before
  asset generation (old Gate 3) because generation credentials aren't on this
  machine and the game must not block on them. Placeholders are authored
  primitives at correct scale, so prop swap-in is non-breaking.
- Ball is 27 mm standard (SCALE.md) — build prompt's "~10.6 mm" was not a real
  pinball size. Flagged in Gate 1 report.
