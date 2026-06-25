# Scope: Free Movement Shooting Physics (R3)

## Architecture
- Game loop handles controls in `src/GameCanvas.jsx`.
- Player input updates coordinates and state (like walking, climbing).
- Spawning ropes triggers shooting animation. Movement might be restricted while ropes are present.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Free Movement Shooting Physics | Allow horizontal movement & ladder climbing during hook activity | None | IN_PROGRESS |

## Interface Contracts
- Player state shape (`gameStateRef.current.player`): `x`, `y`, `vy`, `speed`, `isClimbing`, `onGround`, etc.
- Rope shape (`gameStateRef.current.ropes`): array of active ropes.
