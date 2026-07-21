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
- [x] git init, initial commit, GitHub repo (M2ClawdBot2/swamp-tilt), push
- [x] Base path `/games/pinball/`
- [x] GitHub Pages staging deploy (`.github/workflows/pages.yml`) — live at
      https://m2clawdbot2.github.io/swamp-tilt/games/pinball/
- [x] `vercel.json` ready for the real ufcr.online deploy (Sam connects domain)

## Phase 1 — Multilevel traversal (Gate 2)
One continuous physics world, three Y-strata. Ball transitions are physical.
- [x] L2 (The Reitz, y=+40) authored colliders: narrow field, floor with
      fall-through gaps instead of outlanes, its own flipper pair (mini-scale)
- [x] L3 (The Bench, y=+80) authored colliders: tightest field, ONE flipper
- [x] Right ramp L1→L2: single-incline enclosed tube, ball carries velocity up
      it (see notes below — a multi-segment smooth profile was tried and
      abandoned; a single incline proved far more reliable)
- [x] Center ramp L2→L3 (same single-incline design)
- [x] Falling: L2 open floor edge drops ball physically back to L1 through an
      enclosed shaft; L3 misses fall to L2 the same way
- [x] Camera: per-level framing (CameraRig), 400 ms eased dolly on level
      change, deadzone ball-follow with heavy damping (never hard-locked)
- [x] Flipper input routes to the flippers of the ball's current level (both
      buttons drive every level's flippers simultaneously — real multi-tier
      machines work this way; Bench's single flipper answers either button)
- [x] Headless proof: `npm run test:gate2` — full L1→L2→(fall)→L1→L2→L3→
      (fall)→L2→(fall)→L1 cascade, ALL PASS
- [x] Video capture of the full traversal (harness/gate2-video.spec.ts)

### Phase 1 hard-won lessons (read before touching ramp/level code again)
- **Ramps are single straight inclines, not smooth multi-arc/Bézier profiles.**
  Every extra joint in a multi-segment curve is a chance for the ball to clip
  a seam and bleed speed to friction/restitution. A single incline has
  exactly one joint (the entry) and was far more reliable in practice.
- **Never let two colliders occupy the same space.** Found twice: Reitz's
  `laneWallX` wall duplicated the L2→L3 ramp's own side wall for its entire
  length (same x, overlapping z), and a Bench boundary wall sat squarely
  inside the ramp tube's footprint. A fast ball straddling two coincident
  colliders gets simultaneous contact resolution from both and kicks
  sideways almost every physics step, silently eating nearly all its speed.
  **Always cut a floor hole for a level's own outgoing ramp**, not just for
  ramps arriving from below — Reitz's floor was solid at x=-11 with no hole
  for its own L2→L3 ramp, so the ball just rode the flat floor under the
  incline instead of climbing it.
  **Never teleport/place a scripted ball onto an already-climbed point of an
  incline.** Placing it 4 cm past a ramp's mouth (at the mouth's *flat*
  floor height) embeds it inside solid climbing geometry, since the incline
  is already elevated there. Scripted shots must start on the flat approach
  *before* the ramp's mouth, exactly like a real ball rolling in.
  **Perimeter/back walls must be tall enough to catch a ball still airborne**
  after a ramp climb — a nominal 6-unit field-wall curb let a ball sail
  clean over the back boundary into the void (fell for -4000+ units before
  the fix). `perimeterH: 22` on Reitz and Bench fixed this; the full-height
  outer shell (`levels/index.ts`) is the last-resort catch, not the primary
  one.
- **Debugging trick that finally worked**: `world.contactPairsWith(ballCol, cb)`
  gives ground truth on what the ball is actually touching, but Rapier
  collider `.handle` prints as a subnormal float (e.g. `5.1e-322`) — decode
  the real integer index with `Math.round(handle / Number.MIN_VALUE)`.

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
