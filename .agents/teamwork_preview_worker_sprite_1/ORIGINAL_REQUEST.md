## 2026-06-24T15:25:54Z
Implement the Premium Character Sprite Evolution (R1) in `src/GameCanvas.jsx`.
This includes:
1. Upgrading the drawing logic in `drawProceduralPlayer` in `src/GameCanvas.jsx` to make the 16-bit characters (Rumi, Zoey, Mira) look visually sharper, with detailed shaded zones, and unique assets (hats/hair/outfits).
2. Implementing the 5 render states (Idle with breathing/blinking, Walk with leg/arm swing and body bobbing, Climb with back of head and backpack, Shoot with recoil compression/muzzle flash, Dizzy with stagger wobble/orbiting stars/x_x eyes).
3. Consolidating the shield drawing logic: remove the neon green circle in `drawCanvas` (lines 1380–1391) and implement a high-fidelity cyan jagged lightning shield aura with layered glow (thick outer cyan glow, thin inner white-cyan hot core) and transient spark particles inside `drawProceduralPlayer`.
4. Ensuring that running `npm run build` succeeds cleanly.

Detailed implementation specifications:
- Character-Specific Outfits & Hairstyles:
  - Rumi: Pink pop princess. Pink hair styled as twin-tails cascading using Bezier curves (`bezierCurveTo`), yellow star hairpins, a pleated pink skirt (instead of trousers), white knee-high socks with pink stripes, and a tiny microphone headset.
  - Zoey: Snapback cap worn backward (replacing safari hat), messy brown bangs, a teal/orange windbreaker hoodie with a zipper line, baggy cargo pants, and neck headphones.
  - Mira: Sleek asymmetric neon purple bob haircut, futuristic angular cyber helmet (replacing safari hat), armored cyber-bodysuit with neon green piping, angular shoulder guards, and a visor with a semi-transparent cyan glow and HUD scanlines.
- Pose animations:
  - Walk: 2-segment knee-bending bipedal walk cycle with matching arm swings, and a vertical bobbing translation on the player sprite based on `walkTimer`.
  - Idle: Subtly bob head and torso to simulate breathing, and blink eyes periodically.
  - Climb: Show back of head (hair covering face, hide visor/eyes/mouth), arms reaching and grabbing upwards, a backpack on the back, and boot soles or turned-out feet.
  - Shoot: Squeeze height slightly for recoil compression, tilt head back with pupils shifted up, and draw an orange/yellow muzzle flash at the tip of launcher for first few frames of shot.
  - Dizzy: Horizontal staggering wobble (`Math.sin`), orbiting yellow stars above the head in an ellipse, x_x eyes, a wavy mouth line, and sweat drops.
- Shield Aura:
  - Inside `drawProceduralPlayer`, if `isShielded`, generate a dynamic 12-16 segment jagged circle with randomized radius offsets per frame.
  - Layer it: a thick outer cyan glow (using `shadowBlur` and color `rgba(0,240,255,0.4)`) and a thin inner hot white core.
  - Draw 2-3 random branching lightning arcs shooting outwards and spawn 3-4 random 2x2px transient sparks.
  - Delete the green circle bubble code in `drawCanvas` lines 1380-1391.

Verification:
- Run `npm run build` and include the terminal outputs in your handoff report.
- Verify layout correctness.
- Write your report and handoff to `/Users/marcocardoso/DEV/cloudcrush-local/.agents/teamwork_preview_worker_sprite_1/handoff.md`.
