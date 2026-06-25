# Handoff Report: Milestone 1 Setup Strategy
**Agent**: teamwork_preview_explorer_m1_2  
**Timestamp**: 2026-06-24T15:25:36Z  

---

## 1. Observation

- **Vite Configuration and Scripts**: In `package.json`, the dev server is run with `npm run dev` starting Vite on standard configuration. The project dependencies include:
  ```json
  "dependencies": {
    "react": "^19.2.7",
    "react-dom": "^19.2.7"
  },
  "devDependencies": {
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.2",
    "oxlint": "^1.69.0",
    "vite": "^8.1.0"
  }
  ```
- **Canvas Rendering Component**: In `src/GameCanvas.jsx` (lines 1612-1621), the component renders the `<canvas>` DOM node:
  ```jsx
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
- **Internal Game State Refs**: In `src/GameCanvas.jsx` (lines 27-59), state is tracked using React refs:
  ```javascript
  const canvasRef = useRef(null);
  
  // Game states and assets stored in refs to avoid React lag during loop
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
  And in lines 72-82, background assets are stored in the ref:
  ```javascript
  const loadBg = (src, bgIdx) => {
    const img = new Image();
    img.onload = () => {
      state.backgrounds[bgIdx] = img;
    };
    img.src = src;
  };
  ```

---

## 2. Logic Chain

1. **Test Runner & Server Integration**: Playwright supports running commands before launching E2E tests through its built-in `webServer` block in `playwright.config.js`. By targeting `npm run dev` and `http://localhost:5173`, the test runner will automatically start Vite in the background and clean up the server process upon test completion (Observation 1).
2. **Accessing Game State**:
   - Because the state is stored inside the local component ref `gameStateRef` to prevent rendering lag (Observation 3), it cannot be accessed through global state variables (`window.*`) or by scraping the DOM.
   - However, since React 19 mounts internal tracking properties onto DOM nodes, selecting the `<canvas>` DOM element yields access to its React Fiber node under a key matching `/^__reactFiber\$/`.
   - By traversing up the Fiber tree (`fiber.return`) past any generic wrapper components (like DOM `div`s), we land on the functional `GameCanvas` component fiber.
   - React stores hooks deterministically in `fiber.memoizedState` in the exact order of their invocation. The component declares `canvasRef` first (Hook 0) and `gameStateRef` second (Hook 1). Therefore, `fiber.memoizedState.next.memoizedState` yields the `gameStateRef` object itself.
   - The value is referenced via `ref.current`.
3. **Serialization Constraint**:
   - Playwright's `page.evaluate()` passes objects across a boundary that requires JSON serialization.
   - The `gameStateRef.current` object holds non-serializable elements such as custom HTML `Image()` elements loaded into `state.backgrounds` (Observation 3).
   - Thus, a custom map function is needed to filter, extract, and serialize only the primitive properties (such as coordinates, list counts, weapon types) needed for testing.

---

## 3. Caveats

- **Autoplay Audio Policy**: Playwright's browser triggers browser autoplay policies when audio is played. Chrome requires `--autoplay-policy=no-user-gesture-required` flags during launch options to prevent standard `AudioContext` errors.
- **Hook Ordering Integrity**: If future developer updates introduce new hooks *before* line 30, the relative hook index of `gameStateRef` (currently Hook 1) will shift. The traversal code must be kept in sync or updated if hooks are inserted before it.

---

## 4. Conclusion

Playwright is highly appropriate and feasible for Cloudcrush-Local E2E tests. By implementing the React Fiber node traversal on the canvas element, we can read the exact internal game coordinates, platform bounds, active ropes, and bubble counts in a highly performant and non-invasive way. A 4-tier test strategy targeting navigation, movement, shooting physics, and collisions provides the ideal coverage roadmap.

---

## 5. Verification Method

To independently verify this strategy once implemented:
1. View `/Users/marcocardoso/DEV/cloudcrush-local/.agents/teamwork_preview_explorer_m1_2/analysis.md` to review configuration and traversal helpers.
2. Verify that running `npx playwright test` spins up the local Vite server, executes the movement tests, and safely halts without throwing serialization errors or hanging.
