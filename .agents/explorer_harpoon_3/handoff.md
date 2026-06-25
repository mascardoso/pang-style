# Handoff Report: Multi-level Harpoon Shooting Physics (R2)

## 1. Observation
From inspecting `src/GameCanvas.jsx`, the following segments were identified:

### A. Bubble-Rope Collision Loop (lines 631–644):
```javascript
      // Rope vs Bubble Collisions
      for (let rIdx = 0; rIdx < state.ropes.length; rIdx++) {
        const rp = state.ropes[rIdx];
        let hitIdx = -1;
        
        for (let bIdx = 0; bIdx < state.bubbles.length; bIdx++) {
          const b = state.bubbles[bIdx];
          if (Math.abs(b.x - rp.x) <= b.radius) {
            if (b.y + b.radius >= rp.y && b.y - b.radius <= floorY) {
              hitIdx = bIdx;
              break;
            }
          }
        }
```

### B. Rope Initialization in `fireWeapon` (lines 240–246):
```javascript
        state.ropes.push({
          x: p.x + p.width / 2,
          y: floorY - 5,
          anchored: false,
          anchorTimer: 0,
          startY: p.y + p.height / 2, // Track which platform level it shot from
        });
```

### C. Rope Drawing in `drawCanvas` (lines 1341–1353):
```javascript
        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x, floorY);
        ctx.stroke();

        // Inner hot core line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.0;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(r.x, r.y + 4);
        ctx.lineTo(r.x, floorY);
        ctx.stroke();
```

## 2. Logic Chain
1. **Vertical Bounds in Collision**: Line 639 uses `b.y - b.radius <= floorY` to determine the bottom boundary of the bubble-rope overlap. This assumes that the rope always extends down to the ground level `floorY` (580).
2. **Platform Shooting Defect**: When the player stands on an elevated platform (e.g. Y = 350) and shoots a harpoon:
   - The hook `y` is initialized at `floorY - 5` (495) and travels upwards, meaning the hook's tip starts growing from the ground floor instead of the platform.
   - Even if we initialized `y` to the platform height, the collision detection checks up to `floorY` (580). This results in false-positive collisions with bubbles floating *underneath* the platform because they overlap the vertical projection between the platform and the floor.
3. **Adjustment Method**:
   - In `fireWeapon`, we initialize the hook tip `y` and origin `startY` to `p.y + p.height - 5` (which corresponds to player's active height offset by 5px).
   - In `updatePhysics`, we check vertical overlap using `b.y - b.radius <= rp.startY` instead of `floorY`. Since `rp.startY` represents the bottom/starting position of the rope, this restricts collisions to the active span `[rp.y, rp.startY]`.
   - In `drawCanvas`, drawing from `r.y` to `r.startY` instead of `floorY` ensures the visual representation terminates on the platform.

## 3. Caveats
- No test suite exists for checking collision bounds, so verification must be manual or via visual testing.
- Assumes the player's `p.y + p.height` corresponds perfectly to their feet level when standing on platforms (which is confirmed by platform collision handling in `updatePhysics`).

## 4. Conclusion
To align the bubble-rope collision bounds, initialization, and rendering with active platform heights:
1. Update `fireWeapon` to initialize `y` and `startY` to `p.y + p.height - 5`.
2. Update the vertical collision condition in `updatePhysics` to `b.y - b.radius <= rp.startY`.
3. Update `drawCanvas` lines to draw to `r.startY` instead of `floorY`.
A patch has been generated at `.agents/explorer_harpoon_3/proposed_changes.patch` to execute these changes.

## 5. Verification Method
- Apply the proposed patch using `git apply .agents/explorer_harpoon_3/proposed_changes.patch`.
- Verify the build compiles successfully: `npm run build` and `npm run lint`.
- Run the game locally: climb to an elevated platform, shoot, and verify:
  1. The rope tip starts from the player's position.
  2. The drawn line terminates on the platform.
  3. Bubbles passing underneath the platform do not pop when they cross the vertical line below the platform.
