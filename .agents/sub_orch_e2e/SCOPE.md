# Scope: E2E Testing Track

## Architecture
- React + Canvas arcade game.
- E2E tests run in a headless browser against the local Vite server (running on port 5173 by default).
- Opaque-box interaction via simulated keyboard inputs (ArrowLeft/KeyA, ArrowRight/KeyD, ArrowUp/KeyW, ArrowDown/KeyS, Space) sent to the canvas element.
- Deep state verification via React Fiber traversal on the `<canvas>` element (retrieving `gameStateRef.current` without modifying application source code).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Test Harness & Runner Setup | Install Playwright, configure runner, run app dev server, verify basic canvas loading, select character, start game | None | PLANNED |
| 2 | Tier 1: Feature Coverage | Implement >=5 test cases per feature (sprites/shield aura, multi-level harpoons, free movement while shooting) | M1 | PLANNED |
| 3 | Tier 2: Boundary & Corner Cases | Implement >=5 test cases per feature (e.g. wall/ceiling boundaries, quick shooting limits, shield durability, floor boundaries) | M2 | PLANNED |
| 4 | Tier 3: Cross-Feature Combinations | Implement pairwise feature combination tests (climbing while shooting, moving while shooting, shooting with active shield, etc.) | M3 | PLANNED |
| 5 | Tier 4: Real-world Workloads | Implement realistic gameplay scenarios (clearing bubbles on Level 1, Level 2, Level 3; bubble division; game over; stage clear) | M4 | PLANNED |
| 6 | Verification & Publication | Run full test suite, verify clean run, generate TEST_READY.md and TEST_INFRA.md | M5 | PLANNED |

## Interface Contracts
- Testing interface relies on:
  - Vite local server running.
  - Browser DOM element selectors: `#root`, `canvas`, buttons like `.primary-btn` (Choose Idol, Lock In & Play, Retry).
  - React 19 Fiber traversal path: `canvas.__reactFiber$...` to retrieve `gameStateRef.current` for checking:
    - `gameState.player`: `x`, `y`, `shieldActive`, `isClimbing`, `onGround`, `weapon`, `lives`
    - `gameState.ropes`: `{ x, y, anchored, startY }`
    - `gameState.bubbles`: `{ x, y, vx, vy, size, radius }`
