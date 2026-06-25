# Handoff Report: Multi-level Harpoon Shooting Physics (R2) - Rendering & Physics Alignment

## 1. Observation

In `src/GameCanvas.jsx`, we observed the following key details:

### A. Rope Hook Instantiation
In the `fireWeapon` function (lines 240-246), new ropes are created and pushed to `state.ropes` as follows:
```javascript
        state.ropes.push({
          x: p.x + p.width / 2,
          y: floorY - 5,
          anchored: false,
          anchorTimer: 0,
          startY: p.y + p.height / 2, // Track which platform level it shot from
        });
```

### B. Drawing Logic (Canvas Render Loop)
In the `drawCanvas` function (lines 1340-1353), the segmented chain and the inner hot core are drawn using the global constant `floorY` for their bottom limits:
```javascript
        // Segmented chain rope style
        ctx.strokeStyle = r.anchored ? 'rgba(0, 240, 255, 0.95)' : 'rgba(168, 85, 247, 0.8)';
        ctx.lineWidth = 3.5;
        ctx.setLineDash([5, 5]);
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

### C. Bubble-Rope Collision Detection
In the `updatePhysics` function (lines 636-644), collision checks between the bubble and the rope check vertical overlap against `floorY`:
```javascript
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

---

## 2. Logic Chain

1. **Alignment of Initial Height**:
   - `p.y` is the top-left coordinate of the player sprite box, and `p.height` is its height. Thus, `p.y + p.height` represents the ground/platform level on which the player stands.
   - Initializing both `y` and `startY` to `p.y + p.height - 5` places the starting point and tip of the rope at the player's active platform level.

2. **Drawn Line Termination**:
   - In `drawCanvas`, replacing `floorY` with the rope's dynamic `r.startY` coordinate limits the drawing loop to only render between the current tip `r.y` and the initial shooting level `r.startY`.

3. **Collision Bounds Alignment**:
   - In `updatePhysics`, changing the check `b.y - b.radius <= floorY` to `b.y - b.radius <= rp.startY` bounds the rope collision box to the active platform height. This prevents lower-level bubbles from popping when they pass beneath an active rope segment on an upper platform.

---

## 3. Caveats

- **Vertical offset**: The offset `- 5` in `p.y + p.height - 5` is used to prevent the rope from sticking or clipping weirdly with the platform surface.
- **Ascending check**: The platform collision check during ascent (`r.startY > plat.y + plat.h` in lines 487-491) is preserved, as `startY` will still correctly represent the bottom boundary of the rope.

---

## 4. Conclusion

To fix the harpoon starting height and rendering/collision termination:
1. Modify `fireWeapon` to initialize `y` and `startY` using the player's active height (`p.y + p.height - 5`).
2. Update `drawCanvas` to draw to `r.startY` instead of `floorY`.
3. Update `updatePhysics` collision bounds to check against `rp.startY` instead of `floorY`.

### Proposed Changes

#### Change 1: `src/GameCanvas.jsx` (Lines 240-246)
**Before:**
```javascript
        state.ropes.push({
          x: p.x + p.width / 2,
          y: floorY - 5,
          anchored: false,
          anchorTimer: 0,
          startY: p.y + p.height / 2, // Track which platform level it shot from
        });
```
**After:**
```javascript
        state.ropes.push({
          x: p.x + p.width / 2,
          y: p.y + p.height - 5,
          anchored: false,
          anchorTimer: 0,
          startY: p.y + p.height - 5, // Track which platform level it shot from
        });
```

#### Change 2: `src/GameCanvas.jsx` (Lines 636-644)
**Before:**
```javascript
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
**After:**
```javascript
        for (let bIdx = 0; bIdx < state.bubbles.length; bIdx++) {
          const b = state.bubbles[bIdx];
          if (Math.abs(b.x - rp.x) <= b.radius) {
            if (b.y + b.radius >= rp.y && b.y - b.radius <= rp.startY) {
              hitIdx = bIdx;
              break;
            }
          }
        }
```

#### Change 3: `src/GameCanvas.jsx` (Lines 1340-1353)
**Before:**
```javascript
        // Segmented chain rope style
        ctx.strokeStyle = r.anchored ? 'rgba(0, 240, 255, 0.95)' : 'rgba(168, 85, 247, 0.8)';
        ctx.lineWidth = 3.5;
        ctx.setLineDash([5, 5]);
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
**After:**
```javascript
        // Segmented chain rope style
        ctx.strokeStyle = r.anchored ? 'rgba(0, 240, 255, 0.95)' : 'rgba(168, 85, 247, 0.8)';
        ctx.lineWidth = 3.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x, r.startY);
        ctx.stroke();

        // Inner hot core line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.0;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(r.x, r.y + 4);
        ctx.lineTo(r.x, r.startY);
        ctx.stroke();
```

---

## 5. Verification Method

- **Syntax & Bundling**: Run `npm run build` and `npm run lint` (or `npx oxlint`) to confirm no compilation or formatting issues are introduced.
- **Manual Verification**: Run `npm run dev` and navigate to a level with multiple platform heights. Stand on an elevated platform, shoot, and verify:
  1. The rope chain does not draw down to the floor, but ends cleanly at the elevated platform level.
  2. Bubbles passing underneath the platform are untouched.
  3. Bubbles floating directly over the platform trigger pop collisions upon contact with the rope.
