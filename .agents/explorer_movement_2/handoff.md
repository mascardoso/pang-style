# Handoff Report: Free Movement Shooting Physics (R3) - Analysis & Recommendations

## 1. Observation

In `src/GameCanvas.jsx`, we observed the following code components:

### A. Player Movement & Climbing Control Restrictions
In the `updatePhysics` loop (lines 328–408):
```javascript
      // MOVEMENT LOCK DISABLED: Horizontal mobility is preserved while shooting hooks
      const isFrozenInPlace = false;
      
      // Ladder check overlap
      const overlappedLadder = checkLadderOverlap(p, state.ladders);

      // Handle climbing transitions
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

### B. Hook Spawning Height Origin
In the `fireWeapon` function (lines 229–248):
```javascript
    // Fire hook (locked when rope is growing)
    const fireWeapon = () => {
      const p = state.player;
      
      const hasGrowingRope = state.ropes.some(r => !r.anchored);
      if (hasGrowingRope) return;

      const maxRopes = p.weapon === 'double' ? 2 : 1;
      const activeCount = state.ropes.length;

      if (activeCount < maxRopes) {
        audio.playShoot();
        state.ropes.push({
          x: p.x + p.width / 2,
          y: floorY - 5,
          anchored: false,
          anchorTimer: 0,
          startY: p.y + p.height / 2, // Track which platform level it shot from
        });
      }
    };
```

### C. Double Hook Shooting Restriction
In `fireWeapon` (lines 232–233):
```javascript
      const hasGrowingRope = state.ropes.some(r => !r.anchored);
      if (hasGrowingRope) return;
```

---

## 2. Logic Chain

From these observations, we trace the step-by-step reasoning to our conclusions:

1. **Horizontal and Climbing Movement Restrictions (via `isFrozenInPlace`)**:
   - In traditional Pang clones, the player's position is frozen while shooting. In the codebase, this is managed by the local boolean `isFrozenInPlace` (Observation A, line 329).
   - If `isFrozenInPlace` evaluates to `true` (e.g. if it checks whether any ropes are active/growing), it prevents horizontal movement because of line 371: `if (!isFrozenInPlace && !p.isClimbing)`.
   - It also disables starting to climb a ladder because of line 335: `if (overlappedLadder && !isFrozenInPlace)`.
   - Crucially, if `isFrozenInPlace` is `true`, a climbing player who fires a hook will drop off the ladder and fall to the ground. This occurs because line 335 evaluates to `false` when `isFrozenInPlace` is true, causing execution to flow to the `else` block (line 365) which resets `p.isClimbing = false`.
   - Currently, a temporary workaround exists in the code where `isFrozenInPlace` is hardcoded to `false` (Observation A, line 329). Leaving it hardcoded to `false` (or deleting the variable/removing its usage completely) preserves player walk and climbing responsiveness at all times.

2. **Visual/Functional Climbing Origin Restriction**:
   - In `fireWeapon` (Observation B, line 242), the initial vertical position of the hook `y` is hardcoded to `floorY - 5`.
   - Even if the player is climbing a ladder high above the floor and fires, the hook visual and collision bounds start growing from the bottom floor rather than the player's actual height on the ladder.
   - The fix requires initializing both `y` and `startY` of the rope to the player's active height: `p.y + p.height - 5`. This ensures the hook shoots correctly from the player's current vertical coordinates (aligned with the platform shooting height fix of R2).

3. **Double Hook Shooting Capability Block**:
   - In `fireWeapon` (Observation C, line 232), the condition `const hasGrowingRope = state.ropes.some(r => !r.anchored); if (hasGrowingRope) return;` is evaluated.
   - Since standard hooks never anchor (only sticky hooks do), a standard hook is always "growing" (`!r.anchored` is true) until it hits the ceiling and is deleted.
   - As a result, the player can never fire the second hook of the "Double Hook" weapon while the first is growing/climbing, which directly violates the requirement to fire two hooks concurrently.
   - The fix requires refactoring the limit check so that firing is only blocked if the number of *currently growing* ropes meets or exceeds the weapon's `maxRopes` limit:
     ```javascript
     const growingCount = state.ropes.filter(r => !r.anchored).length;
     const maxRopes = p.weapon === 'double' ? 2 : 1;
     if (growingCount >= maxRopes) return;
     ```

---

## 3. Caveats

- **Visual Poses**: If the player is climbing a ladder and fires a hook, their arms are drawn in the climbing pose while the weapon launcher is drawn pointing straight up. This minor visual mismatch doesn't impact physics, but is worth noting.
- **Double Hook Limits**: Double hooks should not be able to exceed 2 active ropes. The recommended check `growingCount >= maxRopes` enforces this correctly.

---

## 4. Conclusion

To ensure player horizontal movement and climbing capabilities are fully preserved and functional while hooks are active, we recommend implementing the following changes in `src/GameCanvas.jsx`:

1. **Remove `isFrozenInPlace` or Keep it Hardcoded to `false`**:
   Ensure `isFrozenInPlace` remains `false` (or is removed from control checks) so that walking, climbing, and remaining on ladders are never blocked or interrupted during hook/rope activity.

2. **Update Hook Starting Position in `fireWeapon`**:
   ```javascript
   // Change from:
   y: floorY - 5,
   startY: p.y + p.height / 2,
   // To:
   y: p.y + p.height - 5,
   startY: p.y + p.height - 5,
   ```
   This ensures that when a player shoots while climbing a ladder or standing on an elevated platform, the hook starts from their active vertical height rather than the floor.

3. **Fix Double Hook Firing Block**:
   Replace the early return block in `fireWeapon`:
   ```javascript
   // Change from:
   const hasGrowingRope = state.ropes.some(r => !r.anchored);
   if (hasGrowingRope) return;
   
   const maxRopes = p.weapon === 'double' ? 2 : 1;
   const activeCount = state.ropes.length;
   
   if (activeCount < maxRopes) { ... }
   
   // To:
   const growingCount = state.ropes.filter(r => !r.anchored).length;
   const maxRopes = p.weapon === 'double' ? 2 : 1;
   
   if (growingCount < maxRopes) { ... }
   ```
   This counts the number of growing hooks and permits firing the second double hook while the first is active.

---

## 5. Verification Method

To verify the analysis and recommendations independently:
1. Examine `src/GameCanvas.jsx` to confirm that `isFrozenInPlace` is currently `false` and doesn't block player controls.
2. Confirm that running `npm run build` and `npm run lint` compiles cleanly with the proposed changes.
3. Test double hook mechanics by obtaining the Double Hook power-up, and verifying that two hooks can be fired in quick succession while the other is still growing.
4. Verify that firing a hook while climbing a ladder or standing on a platform starts the hook at the player's current vertical coordinates (`p.y + p.height - 5`) rather than the ground level.
