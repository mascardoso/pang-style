# Handoff Report — Milestone 1: Setup E2E Test Harness & Runner

## 1. Observation

- **React and Vite Versions**:
  - File: `/Users/marcocardoso/DEV/cloudcrush-local/package.json`
  - Lines:
    ```json
    13:     "react": "^19.2.7",
    14:     "react-dom": "^19.2.7"
    ...
    21:     "vite": "^8.1.0"
    ```
- **Vite Configuration**:
  - File: `/Users/marcocardoso/DEV/cloudcrush-local/vite.config.js`
  - Content:
    ```javascript
    import { defineConfig } from 'vite'
    import react from '@vitejs/plugin-react'

    export default defineConfig({
      plugins: [react()],
    })
    ```
- **Game State Storage (Ref-based)**:
  - File: `/Users/marcocardoso/DEV/cloudcrush-local/src/GameCanvas.jsx`
  - Lines 30-59:
    ```javascript
    const gameStateRef = useRef({
      player: {
        x: 380,
        y: 0,
        width: 36,
        height: 56,
        speed: 4.8,
        invulnTimer: 0,
        weapon: 'single', // 'single', 'double', 'sticky'
        shieldActive: false,
        isClimbing: false,
        onGround: true,
        vy: 0,
        walkTimer: 0,
      },
      ropes: [], // Array of { x, y, anchored, anchorTimer }
      bubbles: [], // Array of { x, y, vx, vy, size, radius }
      particles: [], // Array of { x, y, vx, vy, life, maxLife, color, size, type }
      powerups: [], // Array of { x, y, vy, type }
      timeFreezeTimer: 0,
      blossoms: null,
      sprites: {},
      backgrounds: {},
      keysPressed: {},
      level: 1,
      score: 0,
      lives: 3,
      platforms: [], // Array of { x1, x2, y, h }
      ladders: [], // Array of { x, y1, y2 }
    });
    ```
- **Canvas Rendering and DOM hookup**:
  - File: `/Users/marcocardoso/DEV/cloudcrush-local/src/GameCanvas.jsx`
  - Lines 1612-1621:
    ```javascript
    <canvas
      ref={canvasRef}
      width={screenWidth}
      height={screenHeight}
      style={{
        border: 'none',
        borderRadius: '16px',
        background: '#070a17',
      }}
    />
    ```

---

## 2. Logic Chain

1. **E2E Strategy Selection**: Standard DOM testing is insufficient because the game's contents (player, bubbles, ropes) are rendered procedurally on an HTML5 canvas 2D context. We need an E2E framework that lets us query the browser window and execute Javascript to inspect internal state. **Playwright** is chosen as the industry standard due to its speed, reliable auto-waiting, headless execution, multi-browser support, and excellent developer UI mode.
2. **Background Server Management**: To run E2E tests, the local Vite dev server must be running. Playwright offers a native `webServer` option in its configuration file. Setting `command: 'npm run dev'` and `url: 'http://localhost:5173'` instructs Playwright to start the server in the background, run tests when the port is ready, and shut it down afterward. Setting `reuseExistingServer: !process.env.CI` makes local test execution fast.
3. **Canvas State Access (React 19 Fiber Traversal)**:
   - React 19 attaches virtual DOM metadata (Fiber nodes) to DOM elements using a key prefixed with `__reactFiber$`.
   - In `GameCanvas.jsx`, the canvas DOM node is rendered within `GameCanvas` component.
   - Using `document.querySelector('canvas')` retrieves the canvas DOM node.
   - Traversing the Fiber node's `.return` references moves upward through the Fiber tree from `'canvas'` to `'div'` and then to `GameCanvas` component fiber.
   - In functional components, React stores hook references sequentially in a linked list starting at `fiber.memoizedState`.
   - The first hook is `canvasRef` and the second is `gameStateRef`.
   - Scanning the hooks linked list for an object matching the game state's properties (`player` and `bubbles`) yields `gameStateRef.current` dynamically.
   - Because standard Vite does not mangle properties, the keys `player`, `bubbles`, `ropes`, etc. remain intact in the client build, allowing a robust query function to find and serialize the state.
4. **Gameplay Control**: Playwright can simulate key presses (e.g. `page.keyboard.down('ArrowRight')`) which triggers window event listeners defined in `GameCanvas.jsx`, updating the coordinate state in `gameStateRef.current`. Tests can subsequently extract coordinates and assert correctness.

---

## 3. Caveats

- **React Fiber Internals Dependency**: The `__reactFiber$` key prefix and Fiber tree properties (`return`, `memoizedState`, `next`) are React internal implementation details. A major React version upgrade could modify these names or structures.
- **Autoplay/Audio Constraints**: Web Audio contexts in headless environments might throw errors without user interaction. Playwright launch options should include `--autoplay-policy=no-user-gesture-required` to circumvent this.
- **Synchronization**: Asynchronous E2E tests are executed independently from the 60 FPS canvas loop. Brief delays (`page.waitForTimeout`) or state-polling checks are required to prevent race conditions during assertions.

---

## 4. Conclusion

The recommended strategy is to install and configure Playwright to run Vite in the background, write a React Fiber traversal utility in `tests/helpers/canvasHelper.js` to extract internal game state, and write E2E tests in `tests/gameplay.spec.js` that command the browser inputs and perform assertions using the retrieved state.

---

## 5. Verification Method

Once implemented, the setup can be verified by running:
1. `npm run test:e2e` (runs Playwright tests headlessly with background server).
2. `npm run test:e2e:ui` (runs Playwright in interactive UI mode).

### Invalidation Conditions:
- If a future React update renames `__reactFiber$`, `return`, `memoizedState`, or `next`, the traversal utility will return `null`.
- If Vite custom build configurations enable aggressive property mangling, the keys `player` or `bubbles` could be renamed, causing the traversal helper to fail to identify the correct hook.
