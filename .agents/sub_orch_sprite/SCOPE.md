# Scope: Premium Character Sprite Evolution (R1)

## Architecture
- **Component**: `src/GameCanvas.jsx`
- **Render Loop**: `drawCanvas` is called periodically by the animation loop.
- **Player Drawing**: `drawCanvas` calls `drawProceduralPlayer(ctx, p, character, state)`.
- **Inputs**:
  - `p`: Player object in game state containing pose state (`isClimbing`, `walkTimer`, `invulnTimer`, `shieldActive`, etc.), position (`x`, `y`), dimensions (`width`, `height`).
  - `character`: Selected character identifier string (`'rumi'`, `'zoey'`, `'mira'`).
  - `state`: Main game state object including inputs (keys pressed), active weapons, etc.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Premium Character Sprite Evolution | Implement sharp black outlines, shaded fills, detailed hairstyles/hats/outfits, and distinct render states (Idle, Walk, Climb, Shoot, Dizzy). | None | PLANNED |
| 2 | Cyan Lightning Shield Aura | Draw a jagged cyan halo wrapping the player whenever the shield is active (`p.shieldActive`). | None | PLANNED |

## Interface Contracts
### `drawProceduralPlayer` Signature
- `drawProceduralPlayer(ctx, p, character, state)`
- Renders the character procedurally on the 2D canvas context `ctx` within boundaries of `p.x`, `p.y`, `p.width`, `p.height`.
- Incorporates dynamic states:
  - `p.isClimbing`: Climb pose (back of head, hands climbing).
  - `p.invulnTimer > 40` (or similar dizzy threshold): Dizzy pose (`x_x` eyes, arms/legs expression).
  - `state.ropes.some(r => !r.anchored)`: Shoot pose (aiming/looking up).
  - `isWalking` (walking keys pressed): Walk pose (swinging legs/arms).
  - `p.shieldActive`: Jagged cyan lightning shield aura.
