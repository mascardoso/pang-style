# Handoff Report: Milestone 1 Setup E2E Test Harness & Runner Strategy

## 1. Observation
- **Project layout and source code**:
  - `package.json` specifies `"type": "module"`, React/React-DOM versions `"^19.2.7"`, and Vite version `"^8.1.0"`.
  - `src/App.jsx` implements the application's top-level state: `gameState` ('start', 'select', 'playing', 'clear', 'gameover'), which is toggled via button click elements (e.g. line 212: `<button className="primary-btn" onClick={() => setGameState('select')}>CHOOSE IDOL</button>`, and line 241: `<button className="primary-btn" onClick={startNewGame}>LOCK IN & PLAY</button>`).
  - `src/GameCanvas.jsx` contains key bindings and ref-based game state. Line 30: `const gameStateRef = useRef({ ... })` holds player, ropes, bubbles, platforms, etc. The 1st hook in this component is `canvasRef` (line 27) and the 2nd hook is `gameStateRef` (line 30).
  - `GameCanvas.jsx` handles inputs on window key events (lines 225-226: `window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);`).
  - Input codes checked are: `ArrowUp`, `KeyW`, `ArrowDown`, `KeyS`, `ArrowLeft`, `KeyA`, `ArrowRight`, `KeyD`, `Space` (lines 336-397).
- **DOM element mapping**:
  - `src/GameCanvas.jsx` returns a canvas DOM element at line 1612: `<canvas ref={canvasRef} ... />`.

## 2. Logic Chain
- **E2E Tool Selection**: Since the application is a high-frequency Canvas game with complex controls (e.g. walking, climbing, firing hooks via held/pressed keys) and runs via a Vite local development server, we need a browser automation framework with first-class keyboard/mouse event dispatching and seamless background server orchestration. Playwright satisfies all requirements and integrates natively with Vite.
- **Server Lifecycle**: Manual background process management is prone to leak orphaned processes in headless environments (like CI/CD). Playwright's `webServer` config block manages the Vite server automatically, ensuring it is booted, probed for readiness, and terminated when the runner exits.
- **State Introspection**:
  - Direct testing of canvas visual content via pixel-matching is fragile. Opaque-box testing is much more robust when we can inspect the game state objects in memory.
  - React maps DOM elements to internal Fiber nodes. A React-rendered canvas DOM element has a key starting with `__reactFiber$`.
  - Functional components store their hook states (including `useRef`) as a linked list in the component's Fiber node under `memoizedState`.
  - Finding the correct fiber node can be done robustly by traversing the `.return` chain (upwards from the canvas element) and scanning the hooks linked list (`memoizedState.next...`) for the characteristic structure of `gameStateRef` (containing `player`, `bubbles`, and `ropes`).
  - Playwright's `page.evaluate()` executes Javascript in the browser window context but must return data serialized as JSON. Since `gameStateRef` contains HTMLImageElement assets and nested references, the traversal code must selectively prune the output to return a serializable object to prevent serialization errors.

## 3. Caveats
- **Headless Browser Execution Speed**: Some browsers running headless may throttle `requestAnimationFrame` (RAF). If Playwright tests run in headless mode and physics execution drops below 60fps, we may need to pass browser flags (like `--disable-background-timer-throttling` or `--host-resolver-rules`) or execute tests in a visible window (headed mode) if throttling affects collision timing.
- **Physics Determinism**: Bubble paths are deterministic, but small variations in JS execution time or frame pacing could make specific collision timings slightly variable. Tests should rely on logical state verification (e.g., verifying that a collision event eventually decrements lives) rather than asserting exact frames or absolute timings.

## 4. Conclusion
We recommend using **Playwright** as the E2E test runner, utilizing its native `webServer` block to manage Vite, and implementing a React Fiber DOM-traversal helper to query the in-memory game state. This setup is highly reliable, robust against minification, and avoids manual background process management.

## 5. Verification Method
To verify this strategy once implemented:
1. Confirm Playwright packages are added to `package.json` devDependencies.
2. Confirm the presence of `playwright.config.js` at the project root with the `webServer` configured to `npm run dev`.
3. Verify that running `npm run test:e2e` successfully launches the Vite server, opens the browser, traverses the canvas React Fiber node, extracts player position/weapon status, and completes without hanging or throwing serialization errors.
