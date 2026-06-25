# E2E Test Harness & Runner Strategy Analysis

This analysis recommends using **Playwright** as the E2E test runner, configured to launch the local Vite server automatically via its `webServer` option. Internal canvas game state (player position, active bubbles, ropes, score, etc.) will be dynamically extracted in tests by traversing the React 19 Fiber tree from the canvas DOM node's `__reactFiber$` key up to the `GameCanvas` component's `gameStateRef` hook.

---

## 1. Observation

- **React 19 & Vite**: In `package.json` (lines 13-14 and 21), the project dependencies specify React version `^19.2.7` and Vite version `^8.1.0`.
- **Canvas-Based Game Loop**: In `src/GameCanvas.jsx` (lines 4-10, 30-59, 1612-1621), the game renders a single `<canvas>` DOM element, and all core game logic (physics updates, bubbles, player position, active ropes, collisions, and scores) is processed in a high-frequency `requestAnimationFrame` loop.
- **Mutable Ref State**: In `src/GameCanvas.jsx` (lines 30-59), game states are stored in a React Ref (`gameStateRef.current`) to avoid React re-rendering overhead and lag during the high-frequency loop:
  ```javascript
  const gameStateRef = useRef({
    player: { x: 380, y: 0, width: 36, height: 56, ... },
    ropes: [],
    bubbles: [],
    platforms: [],
    ladders: [],
    ...
  });
  ```
- **Standard Bundle Config**: In `vite.config.js` (lines 1-8), the configuration is standard with no property mangling or custom minification that would obfuscate object properties (e.g., `.player`, `.bubbles`, `.ropes`).

---

## 2. Logic Chain

1. **The Challenge of Canvas Testing**: Since the game objects (player, bubbles, ropes) are drawn directly onto a 2D canvas context and do not exist as separate DOM elements, standard E2E locator and assertion strategies (e.g. searching for `.player` in the HTML) cannot be used to verify gameplay state.
2. **React Fiber Hook Extraction**:
   - React associates internal tree metadata (Fiber nodes) directly with DOM elements it instantiates. This node is stored under a key on the DOM element starting with `__reactFiber$`.
   - By retrieving the `<canvas>` DOM element inside the browser context, we can locate this key and access the canvas's Fiber node.
   - By traversing up the Fiber tree using the `.return` pointers, we will reach the Fiber node representing the `GameCanvas` functional component.
   - For functional components, React stores hook states in a linked list starting at `fiber.memoizedState`.
   - Since `gameStateRef` is defined as a hook (the second `useRef` hook in `GameCanvas.jsx` at line 30), its mutable ref container `{ current: ... }` resides in this linked list.
   - Because standard minification does not rename object keys (like `player` or `bubbles`), we can traverse this linked list dynamically and identify the correct hook by scanning for these properties.
3. **Automated Server Management**:
   - Playwright includes a built-in `webServer` configuration that can run `npm run dev` to boot up Vite on port 5173, wait for it to become responsive, run the test suite, and tear it down automatically.
   - To optimize local developer runs, we can set `reuseExistingServer: !process.env.CI` so it doesn't spin up duplicate servers when run locally.
4. **Input Simulation**:
   - Playwright's `page.keyboard` API can simulate real keydown and keyup events (e.g. `ArrowLeft`, `ArrowRight`, `Space`) matching the window-level event listeners registered in `GameCanvas.jsx` (lines 213-226).

---

## 3. Caveats

- **Internal React API Dependency**: The `__reactFiber$` property prefix and the layout of the `memoizedState` hooks linked list are undocumented internal React features. While they have remained stable through React 17, 18, and 19, a major React upgrade in the future could break this traversal mechanism.
- **Web Audio Headless Constraints**: Headless browsers sometimes block audio playback unless explicitly allowed. Since `src/audio.js` generates audio synthesize tones, E2E tests should run with appropriate browser launch flags (e.g., `--autoplay-policy=no-user-gesture-required`) to prevent Web Audio exceptions from interrupting execution.
- **Timing and Synchronization**: Since the canvas loop updates ~60 times a second, test assertions must account for physical movement. A brief delay or waiting for a state condition (e.g., checking if `bubbles.length` decreases after shooting) is required to avoid race conditions.

---

## 4. Conclusion

The optimal strategy for Milestone 1 is to:
1. Install and configure **Playwright** as the E2E test runner.
2. Configure Playwright's `webServer` to launch and manage the local Vite server (`npm run dev`) at `http://localhost:5173`.
3. Implement a React Fiber state extraction helper running inside the browser context to inspect `gameStateRef.current`.
4. Command the game via standard Playwright mouse/keyboard events and verify gameplay logic by asserting against the extracted in-memory state.

---

## 5. Implementation Strategy Details

### A. E2E Tooling & Installation
Run the following commands to install Playwright and its browser binaries:
```bash
npm install --save-dev @playwright/test
npx playwright install
```

### B. Playwright Configuration (`playwright.config.js`)
Create this file in the project root directory:
```javascript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run sequentially to avoid input conflicts in single-player game
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker prevents keyboard input overlaps
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--autoplay-policy=no-user-gesture-required']
        }
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
```

### C. React Fiber Traversal Helper (`tests/helpers/canvasHelper.js`)
This script executes inside the browser's context to inspect the game canvas state:
```javascript
/**
 * Traverses the React Fiber tree from the Canvas DOM element
 * to extract the mutable game state ref.
 */
export async function getCanvasGameState(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return null;

    // Find the react fiber internal key on the canvas element
    const fiberKey = Object.keys(canvas).find(key => key.startsWith('__reactFiber$'));
    if (!fiberKey) return null;

    let fiber = canvas[fiberKey];
    while (fiber) {
      // Functional component hooks are stored as a linked list in memoizedState
      let hook = fiber.memoizedState;
      while (hook) {
        if (
          hook.memoizedState && 
          typeof hook.memoizedState === 'object' && 
          'current' in hook.memoizedState
        ) {
          const stateRef = hook.memoizedState.current;
          // Validate that this hook contains the game state object shape
          if (
            stateRef && 
            typeof stateRef === 'object' && 
            'player' in stateRef && 
            'bubbles' in stateRef
          ) {
            // Return a serializable snapshot of the game state
            return {
              player: {
                x: stateRef.player.x,
                y: stateRef.player.y,
                width: stateRef.player.width,
                height: stateRef.player.height,
                weapon: stateRef.player.weapon,
                shieldActive: stateRef.player.shieldActive,
                isClimbing: stateRef.player.isClimbing,
                onGround: stateRef.player.onGround,
                vy: stateRef.player.vy,
              },
              bubbles: stateRef.bubbles.map(b => ({
                x: b.x,
                y: b.y,
                vx: b.vx,
                vy: b.vy,
                size: b.size,
                radius: b.radius
              })),
              ropes: stateRef.ropes.map(r => ({
                x: r.x,
                y: r.y,
                anchored: r.anchored
              })),
              platforms: stateRef.platforms,
              ladders: stateRef.ladders,
              lives: stateRef.lives,
              score: stateRef.score,
              level: stateRef.level
            };
          }
        }
        hook = hook.next;
      }
      fiber = fiber.return;
    }
    return null;
  });
}
```

### D. Proposed E2E Test Cases (`tests/gameplay.spec.js`)
Below is a sample structure for the gameplay test verifying start flow, character selection, player movement, shooting, and state extraction:
```javascript
import { test, expect } from '@playwright/test';
import { getCanvasGameState } from './helpers/canvasHelper';

test.describe('Cloudcrush Arcade Game E2E Suite', () => {

  test('should navigate start screen and select Rumi', async ({ page }) => {
    await page.goto('/');

    // 1. Start Screen
    const chooseIdolBtn = page.locator('button.primary-btn', { hasText: 'CHOOSE IDOL' });
    await expect(chooseIdolBtn).toBeVisible();
    await chooseIdolBtn.click();

    // 2. Select Character Screen
    const lockInBtn = page.locator('button.primary-btn', { hasText: 'LOCK IN & PLAY' });
    await expect(lockInBtn).toBeVisible();
    
    // Check if cards are present and select Rumi (default)
    const rumiCard = page.locator('.char-select-card.selected', { hasText: 'Rumi' });
    await expect(rumiCard).toBeVisible();
    await lockInBtn.click();

    // 3. Game Started - Canvas Rendered
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Get initial state
    const initialState = await getCanvasGameState(page);
    expect(initialState).not.toBeNull();
    expect(initialState.player.weapon).toBe('single');
    expect(initialState.level).toBe(1);
    expect(initialState.lives).toBe(3);
  });

  test('should verify horizontal walking updates state coordinates', async ({ page }) => {
    // Navigate to gameplay
    await page.goto('/');
    await page.click('button.primary-btn:has-text("CHOOSE IDOL")');
    await page.click('button.primary-btn:has-text("LOCK IN & PLAY")');

    // Get initial player coordinates
    const stateBefore = await getCanvasGameState(page);
    const initialX = stateBefore.player.x;

    // Simulate holding ArrowRight key
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(300); // Walk for 300ms
    await page.keyboard.up('ArrowRight');

    // Verify player coordinate moved right
    const stateAfter = await getCanvasGameState(page);
    expect(stateAfter.player.x).toBeGreaterThan(initialX);
  });

  test('should verify firing weapon spawns a rope', async ({ page }) => {
    // Navigate to gameplay
    await page.goto('/');
    await page.click('button.primary-btn:has-text("CHOOSE IDOL")');
    await page.click('button.primary-btn:has-text("LOCK IN & PLAY")');

    // Confirm 0 active ropes at start
    const stateBefore = await getCanvasGameState(page);
    expect(stateBefore.ropes.length).toBe(0);

    // Fire hook using spacebar
    await page.keyboard.press('Space');

    // Verify rope was added to state
    const stateAfter = await getCanvasGameState(page);
    expect(stateAfter.ropes.length).toBe(1);
    expect(stateAfter.ropes[0].x).toBeCloseTo(stateAfter.player.x + stateAfter.player.width / 2, 1);
  });
  
  test('should verify platform coordinates are loaded in level 1', async ({ page }) => {
    // Navigate to gameplay
    await page.goto('/');
    await page.click('button.primary-btn:has-text("CHOOSE IDOL")');
    await page.click('button.primary-btn:has-text("LOCK IN & PLAY")');

    const state = await getCanvasGameState(page);
    // Level 1 platform: { x1: 220, x2: 580, y: 350, h: 18 }
    expect(state.platforms.length).toBe(1);
    expect(state.platforms[0]).toEqual({ x1: 220, x2: 580, y: 350, h: 18 });
  });
});
```

### E. Package Scripts (`package.json`)
Add these scripts to `package.json` to simplify E2E runner execution:
```json
"scripts": {
  ...
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:debug": "playwright test --debug"
}
```

---

## 6. Verification Method

Once implemented, this testing harness can be verified as follows:
1. Run `npm run test:e2e` in the terminal.
2. Verify that Playwright boots the Vite server, runs the tests, and reports 100% pass rate.
3. Check the screenshot or HTML report inside the generated `playwright-report` folder to ensure visual layout matches expectations during test execution.
