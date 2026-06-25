# Project: Cloudcrush-Local

## Architecture
- **HTML5 React Canvas 2D Arcade Game**: Single-page application using React + Canvas for physics and rendering.
- **Game Engine**: A single high-frequency anim frame loop in `GameCanvas.jsx` handling keyboard inputs, physics update, collision detection, and rendering.
- **State Management**: Game state (player, bubbles, ropes, platforms, ladders) is stored in a mutable Ref to prevent React rendering lag.
- **Code Layout**:
  - `src/App.jsx`: Main interface, character selection, K-stage backgrounds, UI overlays, audio playback.
  - `src/GameCanvas.jsx`: Canvas initialization, key bindings, game initialization (`initLevel`), physics ticks (`updatePhysics`), and draw routines (`drawCanvas`, `drawProceduralPlayer`).
  - `src/audio.js`: Sound effect triggers using Web Audio API synthesized tones.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | E2E Test Suite | Design and implement Tier 1-4 opaque-box testing framework and tests | None | COMPLETED |
| 2 | Premium Character Evolution | Enhance visual fidelity, outlines, face states, poses, and cyan shield aura | None | COMPLETED |
| 3 | Multi-level Harpoon Shooting Physics | Fix hook starting height and drawing termination to active platform level | None | COMPLETED |
| 4 | Free Movement Shooting Physics | Ensure player horizontal movement and climbing capabilities while hooks are active | None | COMPLETED |
| 5 | E2E Integration & Coverage Hardening | Run E2E verification and perform Tier 5 white-box adversarial coverage hardening | M1, M2, M3, M4 | COMPLETED |

## Interface Contracts
### Player State Shape (`gameStateRef.current.player`)
- `x`, `y`: Position coordinates on canvas.
- `width`, `height`: Visual and collision bounding box.
- `speed`: Horizontal walking speed.
- `weapon`: Current weapon ('single', 'double', 'sticky').
- `shieldActive`: Boolean indicating if cyan lightning shield is active.
- `isClimbing`: Boolean indicating if climbing a ladder.
- `onGround`: Boolean indicating if standing on floor or platform.
- `vy`: Vertical velocity.
- `walkTimer`: Numeric timer to animate swinging limbs.
- `invulnTimer`: Invulnerability tick countdown (also used for dizzy state).

### Rope / Hook Shape (`gameStateRef.current.ropes[i]`)
- `x`: Horizontal center position of hook chain.
- `y`: Current vertical tip position.
- `anchored`: Boolean if sticky hook has reached ceiling/platform.
- `anchorTimer`: Remaining duration for anchored sticky hook.
- `startY`: Vertical start/bottom height position of the hook rope.

### Platform Shape (`gameStateRef.current.platforms[i]`)
- `x1`, `x2`: Left and right bounds of the platform.
- `y`: Top surface Y coordinate.
- `h`: Thickness of the platform.
