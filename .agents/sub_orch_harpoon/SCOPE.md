# Scope: Multi-level Harpoon Shooting Physics (R2)

## Architecture
- **Game Engine**: A single anim frame loop in `src/GameCanvas.jsx` handling physics and rendering.
- **Rope & Hook Logic**: Ropes are created when player shoots. Hook tip starts from player's Y position, grows upwards to ceiling/platform top.
- **Rendering**: `drawCanvas` in `src/GameCanvas.jsx` renders the rope from startY to current tip Y.
- **Collision**: `updatePhysics` or bubble-rope collision check detects if bubble boundary overlaps the rope bounding box.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Analyze Hook/Rope Physics | Investigate how ropes are created, drawn, and collided in `src/GameCanvas.jsx` | None | DONE |
| 2 | Implement Height Alignment | Fix hook starting height, drawing termination, and bubble-rope collision bounds | M1 | DONE |
| 3 | Review & Challenger Verification | Verify character controls, rendering correctness, and run E2E/unit tests | M2 | IN_PROGRESS |
| 4 | Forensic Audit Integrity | Run auditor checks to ensure no cheating, clean implementation | M3 | PLANNED |

## Interface Contracts
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
