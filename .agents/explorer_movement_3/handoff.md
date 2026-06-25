# Handoff Report: Free Movement Shooting Physics (R3)

## 1. Observation
Inside `src/GameCanvas.jsx`, player physics, inputs, and state updates are processed in the `updatePhysics` function (lines 323 to 733).

The codebase references a variable `isFrozenInPlace` to lock the player's movement and climbing abilities when shooting weapons/ropes. 

Specifically, at lines 328–330 of `src/GameCanvas.jsx`:
```javascript
      // MOVEMENT LOCK DISABLED: Horizontal mobility is preserved while shooting hooks
      const isFrozenInPlace = false;
```

This variable is used in three places within `updatePhysics`:
1. **Ladder Climbing Transition/Movement Guard** (lines 335–367):
   ```javascript
   if (overlappedLadder && !isFrozenInPlace) {
     const pressUp = state.keysPressed['ArrowUp'] || state.keysPressed['KeyW'];
     const pressDown = state.keysPressed['ArrowDown'] || state.keysPressed['KeyS'];
     
     if (pressUp || pressDown) {
       if (!p.isClimbing) {
         p.isClimbing = true;
         p.onGround = false;
         p.vy = 0;
         // Center player horizontally onto the ladder
         p.x = overlappedLadder.x - p.width / 2;
       }
       
       if (pressUp) p.y -= 4.0; // climb speed
       if (pressDown) p.y += 4.0;

       // Boundary check on ladder limits
       if (p.y < overlappedLadder.y1 - p.height * 0.8) {
         // Climb off top onto platform
         p.y = overlappedLadder.y1 - p.height;
         p.isClimbing = false;
         p.onGround = true;
       }
       if (p.y > overlappedLadder.y2 - p.height) {
         // Climb off bottom onto ground/lower platform
         p.y = overlappedLadder.y2 - p.height;
         p.isClimbing = false;
         p.onGround = true;
       }
     }
   } else {
     p.isClimbing = false;
   }
   ```

2. **Horizontal Player Movement Guard** (lines 369–380):
   ```javascript
   // Horizontal player controls
   let isMovingHorizontally = false;
   if (!isFrozenInPlace && !p.isClimbing) {
     if (state.keysPressed['ArrowLeft'] || state.keysPressed['KeyA']) {
       p.x -= p.speed;
       isMovingHorizontally = true;
     }
     if (state.keysPressed['ArrowRight'] || state.keysPressed['KeyD']) {
       p.x += p.speed;
       isMovingHorizontally = true;
     }
   }
   ```

3. **Horizontal Ladder Dismount Guard** (lines 395–408):
   ```javascript
   // Dismount ladder horizontally if arrow pressed
   if (p.isClimbing && !isFrozenInPlace) {
     const pressLeft = state.keysPressed['ArrowLeft'] || state.keysPressed['KeyA'];
     const pressRight = state.keysPressed['ArrowRight'] || state.keysPressed['KeyD'];
     if (pressLeft || pressRight) {
       // Dismount if player is near ladder limits or overlapping a platform
       const overlappingPlat = checkPlatformLanding(p, state.platforms);
       if (overlappingPlat || Math.abs(p.y + p.height - floorY) < 15) {
         p.isClimbing = false;
         p.onGround = true;
         if (pressLeft) p.x -= p.speed;
         if (pressRight) p.x += p.speed;
       }
     }
   }
   ```

---

## 2. Logic Chain
1. If `isFrozenInPlace` were dynamically set to `state.ropes.some(r => !r.anchored)` (which evaluates to true when a hook is active/growing), then:
   - The conditional `overlappedLadder && !isFrozenInPlace` would evaluate to `false`. This would run the `else` block (line 365), setting `p.isClimbing = false;` and instantly dropping the player off the ladder if they were climbing.
   - The conditional `!isFrozenInPlace && !p.isClimbing` would evaluate to `false`, completely ignoring horizontal key inputs (left/right/A/D) and blocking horizontal movement.
   - The conditional `p.isClimbing && !isFrozenInPlace` would evaluate to `false`, preventing the player from dismounting ladders horizontally.
2. In the current codebase state, a developer has set `const isFrozenInPlace = false;` as a temporary bypass.
3. This hardcoding to `false` resolves the movement/climbing blocks when ropes are active, but leaves behind dead conditional parameters (like `!isFrozenInPlace` checks) which are redundant and hard to maintain.

---

## 3. Caveats
- Setting `isFrozenInPlace = false` (or removing it entirely) preserves movement, but means the player can move while shooting. The rope's X-axis start position `rp.x` is anchored to the X-coordinate at the moment of firing, which is correct (the rope doesn't walk with the player).
- Visual animations (arms pointing up to shoot vs. walking/swinging) are resolved correctly because the shooting arm pose check has precedence over the walking arm pose check in `drawProceduralPlayer`. Legs will still swing if the player walks while shooting, which is correct and visually high-quality.

---

## 4. Conclusion
To ensure player horizontal movement and climbing capabilities are cleanly and fully maintained while hooks are active, we must clean up and remove the dead/redundant `isFrozenInPlace` logic entirely.

### Recommended Fix Strategy:
Clean up `src/GameCanvas.jsx` as follows:
- Remove line 329: `const isFrozenInPlace = false;`
- Simplify ladder climbing transitions check (line 335):
  ```javascript
  // Before
  if (overlappedLadder && !isFrozenInPlace) {
  
  // After
  if (overlappedLadder) {
  ```
- Simplify horizontal player controls check (line 371):
  ```javascript
  // Before
  if (!isFrozenInPlace && !p.isClimbing) {
  
  // After
  if (!p.isClimbing) {
  ```
- Simplify ladder horizontal dismount check (line 395):
  ```javascript
  // Before
  if (p.isClimbing && !isFrozenInPlace) {
  
  // After
  if (p.isClimbing) {
  ```

This clean-up guarantees that the engine's movement rules are simplified, robust, and explicitly allow simultaneous movement/climbing and shooting.

---

## 5. Verification Method
1. **Compilation/Build Verification**:
   Run `npm run build` in the root directory to verify that removing/changing these variables compiles with zero errors.
2. **Manual Playtest**:
   - Start the game.
   - Shoot a hook (Spacebar) and verify that the player can immediately walk left/right while the hook is growing.
   - Go to a ladder, start climbing (ArrowUp/W or ArrowDown/S), shoot a hook (Spacebar), and verify that the player remains on the ladder and can continue climbing up/down while the hook is active.
