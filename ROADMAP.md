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
- [x] Game state machine: attract → play → ball end → game over (bonus
      counting is folded into ball-end for now, no separate bonus screen yet)
- [x] Scoring core + combo/multiplier plumbing (`state.ts` addScore, preacher
      loop multiplier stacks into it)
- [x] L1: T-A-B-L-E target bank (5 zones) → lights Recruit
- [x] L1: flyer spinner on left orbit (spin count decays every second),
      preacher loop right-orbit ×3 stacking multiplier that resets on drain
- [x] L1: Recruit Multiball — 3 balls, survive 45 s, end-of-mode bonus
- [x] L2: B-U-D-G-E-T targets → funding lit
- [~] L2: bureaucracy bumper cluster — zone + gated timer accumulator exist
      (`bumperTimerAccum`, only ticks while a ball is in `bumperCluster`), but
      nothing consumes the accumulator yet (no mode reads it down). Prototype
      per build-prompt §12; wire a real mode to it or cut it in Phase 4/5.
- [x] L2: filing-cabinet ball lock ×3 → Charter Multiball (spawns on Reitz)
- [x] L2: Denial kickback — flavor-logged on every L2→L1 transition; letters/
      locks already persist across balls by construction (only cleared on a
      brand new game), so "progress held" needed no extra state
- [x] L3: gavel drop target, precedent spinner. Flat 10× scoring NOT wired —
      no per-level scoring multiplier exists yet, only the preacher-loop one.
- [x] L3: lock under gavel (2nd hit) → SUMMARY JUDGMENT wizard: 6 balls
      (4 via `Wizard.setMobile()`, not yet auto-detected), ends at 1 ball,
      award = points scored during the mode × distinct levels visited
- [x] Tilt: `tilt.ts` — warning at 2 nudges in a 2.5s window, tilt at 3, plus
      a physical impulse per nudge. Wired to arrow keys in `main.ts` for
      manual testing; the real shake/two-finger-flick input is Phase 4.
- [ ] Skill shot: plunger with hold-for-power, yard-sign skill target — not
      started; current "launch" is a fixed-power placeholder (see below)
- [x] Ball trough / multiball manager — `multiball.ts` BallPool: spawn, drain
      accounting via `gameLogic.ts`'s checkDrains, ball-end/game-over sequencing
- [x] Headless proof: `npm run test:gate4` — full game through every mode,
      13/13 assertions PASS, score log printed
- [x] Live in the browser too (`?demo=game`, key `N` starts a real game;
      arrow keys nudge, Space launches) — not just the headless proof

### Phase 2 simplifications, flagged for later phases
- **Targets are position zones, not physical drop-target bodies.** A "hit" is
  a live ball's (x,z) crossing a circle on the right level (`zones.ts`). This
  proves the RULES are correct without physically modeling every solenoid —
  Phase 4 can give targets real recoil physics/meshes without touching the
  scoring logic underneath.
- **No plunger lane exists yet**, so a freshly spawned ball at rest just
  rolls downhill into the drain in under a second (found via Gate 4's 45s
  Recruit-survive window silently burning through 49 "balls"). `autoLaunch()`
  in `gameLogic.ts` gives every new ball a fixed -230 cm/s assist as a
  placeholder. The real plunger lane + hold-for-power skill shot (§8, §5)
  needs its own containment wall and replaces this entirely.
- **Same-step ordering matters**: `checkDrains()` must run before the mode
  `tick*()` calls in `GameLogic.step()`, not after — otherwise a multiball
  collapsing to 1 ball on step N isn't visible to `tickCharter`/`tickWizard`
  until step N+1. Harmless at 240 Hz in real play, but broke a headless test
  that only stepped once per assertion (Gate 4 finding).
- **Zone edge-triggering**: `ZoneTracker` only fires on entry (ball wasn't in
  the zone last step, is now) — parking a ball in a zone doesn't infinite-
  score. Anything scripting repeated hits of the same zone must cycle the
  ball out and back in between (see `tests/gate4.ts`'s `hit()` helper).

## Phase 3 — Asset pipeline (Gate 3) `[~]` partially blocked on credentials
`XAI_API_KEY` and `RUNPOD_API_KEY` are populated in the local `.env`
(gitignored, never committed) — found in `florida-man-simulator/.env.local`,
a sibling project's already-provisioned keys, and copied over per Sam's
instruction. `RUNPOD_POD_HOST`/`RUNPOD_POD_ID`/`TRELLIS_ENDPOINT`/
`FLUX_ENDPOINT` are still blank: no pod is currently running, only the API
key to provision one exists. `tools/pod.ts` needs to actually start a pod and
capture its host before the real TRELLIS/FLUX batch can run — that part is
still blocked on Sam confirming pod specs/cost, not on missing credentials.
Until then the game uses authored primitive placeholder props so nothing
downstream waits.
- [x] `tools/pod.ts` — RunPod GraphQL start/resume/stop/status + health
      polling, `withPod()` wraps a batch in a guaranteed-stop `finally` so a
      crash mid-run can't leave the GPU meter running overnight
- [x] `tools/gen-assets.ts` — FLUX→TRELLIS batch per §4 prop table (10
      props incl. authored-only ramp rails), ASSETS.md ledger row appended
      per generated asset, refs/raw/output dirs auto-created
- [x] `tools/postprocess-glb.ts` — iterative decimate-to-budget (a single
      ratio pass under-shoots meshoptimizer's actual error-bounded result,
      so it re-measures and tightens across up to 6 passes), Draco via
      gltf-transform's `draco()` transform, center + scale to SCALE.md's
      1-unit-=-1cm convention, fails loudly on budget overrun AND on
      collapsing to a degenerate 0-tri mesh
- [x] Authored placeholder props for every §4 prop wired through
      `loadProps.ts` (`buildPropPlaceholder(name)`) — primitives at correct
      real-world dimensions (e.g. filing cabinet 40×130×45cm), swap-in for
      the real GLB is a one-line change once one exists (`propModelPath`
      already points at where it'll live). Wired live into the Plaza/Reitz/
      Bench scenes in `main.ts` (yard sign, filing cabinet, gavel) — renders
      with no console errors.
- [x] `tools/gen-callouts.ts` — Grok build-time script; writes a
      `.draft.json`, prints every line to console for review, and only
      writes to the real committed `callouts.json` via an explicit
      `promote` command — never auto-approves generated copy. Committed
      `callouts.json` ships with hand-written lines now (20 events).
- [x] `npm run test:gate3` — proves the decimate/Draco/center-scale/budget-
      enforcement pipeline end to end on a synthetic GLB (can't need a live
      pod for this half), 5/5 PASS
- [!] Real TRELLIS batch + contact sheet — code is ready and typechecked;
      blocked on Sam provisioning/confirming a RunPod pod (cost decision,
      not a missing-credential problem — the API key already works)
- [!] Grok-generated callout variants — `XAI_API_KEY` IS present and the
      script would run today; not run yet because the roadmap prioritized
      proving the pipeline code over spending API budget on copy nobody's
      reviewed the tone of yet. Run `tsx tools/gen-callouts.ts` then review
      the draft before promoting.

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
