# Milestone 1 Strategy: Setup E2E Test Harness & Runner
**Project**: Cloudcrush-Local  
**Author**: teamwork_preview_explorer_m1_2  
**Target File**: `.agents/teamwork_preview_explorer_m1_2/analysis.md`  

---

## 1. Executive Summary

To establish a robust End-to-End (E2E) testing framework for **Anti-Grav Pang** (a React/Canvas-based arcade game), **Playwright** is the recommended tool suite. It provides:
1. **Native support for starting and stopping Vite in the background** via the `webServer` config.
2. **Deep inspection of the client application** through browser-context execution (`page.evaluate`), allowing us to traverse the React Fiber tree and read the mutable game state (`gameStateRef`) directly from the canvas DOM node.
3. **Low-level user input simulation** (e.g., keyboard presses, holds, releases) that directly trigger game loop handlers.
4. **Robust headless execution** and built-in tracing, video recording, and screenshot capturing for failure diagnostics.

This document details the exact installation, configuration, React Fiber extraction strategy, and test layout strategy for Milestone 1.

---

## 2. E2E Tool Selection and Configuration

### Playwright vs. Alternatives
- **Playwright**: Offers first-class keyboard APIs, parallel worker processes, native HTML reports, a built-in background server runner, and extremely fast execution speeds. Crucially, its `page.evaluate()` handles complex JavaScript objects and lets us access React's internal fiber tree seamlessly.
- **Cypress**: Requires a separate running process for the dev server (or third-party setup), has a more complex execution model for low-level node traversals, and is generally slower in headless CI environments.

### Proposed `playwright.config.js`
The following configuration should be placed at the root of the project to initialize Playwright and automatically manage the Vite development server:

```javascript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: {
      // Bypasses Chrome audio autoplay restrictions for synthesized tones
      args: ['--autoplay-policy=no-user-gesture-required'],
    },
  },
  
  /* Automatically runs local dev server in the background prior to tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: 10 * 1000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

---

## 3. React Fiber Traversal on the Canvas DOM Element

### The Core Problem
To test gameplay opaque-box style (with white-box insights), tests must verify properties such as player coordinates ($x$, $y$), bubble splits, hook heights, and shield status. Since the game engine in `GameCanvas.jsx` stores state in a mutable React Ref (`gameStateRef.current`) to avoid React render lag:
1. The state is **not** exposed to the global `window` scope.
2. The state does **not** trigger DOM updates.

### The Solution: React 19 Fiber Tree Traversal
When React renders a DOM node, it attaches internal property pointers containing metadata. Under React 19 (and 18), the Canvas DOM node has a property key starting with `__reactFiber$`.

By locating this property, we can retrieve the React Fiber node corresponding to the `<canvas>` element. We can then walk up the parent tree (`fiber.return`) until we find the fiber representing the `GameCanvas` component. Because the hook invocation order in `GameCanvas.jsx` is deterministic, we can traverse its `memoizedState` to read the game state.

#### Deterministic Hook Index Analysis in `GameCanvas.jsx`:
1. **Hook 0** (`canvasRef = useRef(null)`): Stores `{ current: <canvas> }`.
2. **Hook 1** (`gameStateRef = useRef({ ... })`): Stores the target game state `{ current: { player, ropes, bubbles, ... } }`.
3. **Hooks 2-5**: Various `useEffect` dependencies.

Thus, the target state is located at:
`GameCanvasFiber.memoizedState.next.memoizedState.current`

### Serialization Warning
`gameStateRef.current` contains loaded `HTMLImageElement` objects under the `backgrounds` property. Attempting to return the raw `gameStateRef.current` across the Playwright browser-evaluation bridge will cause a serialization failure. We must map the state into a clean, primitive JSON-serializable structure before returning it.

### Playwright State Extraction Helper
The following helper function extracts the internal game state safely:

```javascript
/**
 * Retrieves a serializable summary of the game state from the canvas.
 * @param {import('@playwright/test').Page} page 
 */
export async function getGameInternalState(page) {
  return await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) throw new Error('Canvas element not found on page');

    // Find React internal fiber key on the canvas element
    const fiberKey = Object.keys(canvas).find(key => key.startsWith('__reactFiber$'));
    if (!fiberKey) throw new Error('React fiber key not found on canvas');

    const canvasFiber = canvas[fiberKey];
    if (!canvasFiber) throw new Error('Canvas Fiber node is undefined');

    // Ascend the Fiber tree to skip DOM elements (divs, wrappers) and reach GameCanvas
    let fiber = canvasFiber;
    while (fiber && typeof fiber.type === 'string') {
      fiber = fiber.return;
    }

    if (!fiber) throw new Error('GameCanvas functional component fiber not found');

    // Traverse the hooks list (linked list in memoizedState)
    // Hook 0 is canvasRef, Hook 1 is gameStateRef
    const hook0 = fiber.memoizedState;
    if (!hook0) throw new Error('Hook 0 (canvasRef) not found in fiber');

    const hook1 = hook0.next;
    if (!hook1) throw new Error('Hook 1 (gameStateRef) not found in fiber');

    const stateRefVal = hook1.memoizedState;
    if (!stateRefVal || !stateRefVal.current) {
      throw new Error('Game state ref is not initialized');
    }

    const state = stateRefVal.current;

    // Filter out non-serializable fields (like backgrounds, sprites, HTMLImageElements)
    return {
      player: {
        x: state.player.x,
        y: state.player.y,
        width: state.player.width,
        height: state.player.height,
        speed: state.player.speed,
        weapon: state.player.weapon,
        shieldActive: state.player.shieldActive,
        isClimbing: state.player.isClimbing,
        onGround: state.player.onGround,
        vy: state.player.vy,
        invulnTimer: state.player.invulnTimer,
      },
      ropes: state.ropes.map(r => ({
        x: r.x,
        y: r.y,
        anchored: r.anchored,
        anchorTimer: r.anchorTimer,
        startY: r.startY,
      })),
      bubbles: state.bubbles.map(b => ({
        x: b.x,
        y: b.y,
        vx: b.vx,
        vy: b.vy,
        size: b.size,
        radius: b.radius,
      })),
      powerups: state.powerups.map(p => ({
        x: p.x,
        y: p.y,
        vy: p.vy,
        type: p.type,
      })),
      timeFreezeTimer: state.timeFreezeTimer,
      level: state.level,
      score: state.score,
      lives: state.lives,
      platforms: state.platforms,
      ladders: state.ladders,
    };
  });
}
```

---

## 4. Installation, Execution, and Test Structure Strategy

### Proposed Directory Layout
Tests will be housed in a root-level `/tests` directory, separated by scope:

```
cloudcrush-local/
├── playwright.config.js       # Playwright config
├── package.json
├── tests/
│   ├── helpers/
│   │   └── game-inspector.js  # Exports getGameInternalState and control key helpers
│   ├── e2e/
│   │   ├── navigation.spec.js # Tier 1: Main menu and Character selection tests
│   │   ├── movement.spec.js   # Tier 2 & 4: Walking, gravity, platform landing, ladder climbing
│   │   ├── shooting.spec.js   # Tier 3: Hook/rope shooting height and platform termination
│   │   └── gameplay.spec.js   # Tier 2 & 3: Collision, bubble pops, power-up collections, game-over
```

### Simulating User Controls
Playwright's keyboard API should be wrapped in helper commands to simulate key presses with controlled timing:

```javascript
/**
 * Simulates walking in a direction for a duration.
 * @param {import('@playwright/test').Page} page
 * @param {'left'|'right'} direction
 * @param {number} durationMs
 */
export async function walkPlayer(page, direction, durationMs) {
  const key = direction === 'left' ? 'ArrowLeft' : 'ArrowRight';
  await page.keyboard.down(key);
  await page.waitForTimeout(durationMs);
  await page.keyboard.up(key);
}

/**
 * Simulates climbing a ladder.
 * @param {import('@playwright/test').Page} page
 * @param {'up'|'down'} direction
 * @param {number} durationMs
 */
export async function climbPlayer(page, direction, durationMs) {
  const key = direction === 'up' ? 'ArrowUp' : 'ArrowDown';
  await page.keyboard.down(key);
  await page.waitForTimeout(durationMs);
  await page.keyboard.up(key);
}

/**
 * Fires the active weapon.
 * @param {import('@playwright/test').Page} page
 */
export async function fireWeapon(page) {
  await page.keyboard.press('Space');
}
```

---

## 5. Recommended Execution Plan

### A. Installation Commands
Install Playwright and setup browsers:
```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```

### B. Package.json Script Additions
Add convenient test runners to `package.json`:
```json
"scripts": {
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:debug": "playwright test --debug"
}
```

### C. Example Test Draft (`tests/e2e/movement.spec.js`)
Here is a sample test showing how the E2E runner inspects the game state to verify movement:

```javascript
import { test, expect } from '@playwright/test';
import { getGameInternalState } from '../helpers/game-inspector';
import { walkPlayer } from '../helpers/game-inspector';

test.describe('Player Movement & Platform Collision', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Navigate from Start Menu to Character Select
    await page.click('button:has-text("CHOOSE IDOL")');
    
    // Lock in character (Rumi by default)
    await page.click('button:has-text("LOCK IN & PLAY")');
    
    // Wait for canvas to mount and game to start
    await page.waitForSelector('canvas');
  });

  test('should move player left and right within limits', async ({ page }) => {
    // Get initial state
    const startState = await getGameInternalState(page);
    const startX = startState.player.x;

    // Walk right for 200ms
    await walkPlayer(page, 'right', 200);

    const movedState = await getGameInternalState(page);
    expect(movedState.player.x).toBeGreaterThan(startX);
    expect(movedState.player.onGround).toBe(true);
  });
});
```

Using this strategy, the implementer can verify all physics, weapon transitions, collisions, and gameplay states in a decoupled, reliable, and headless fashion.
