# Original User Request

## Initial Request — 2026-06-24T17:22:08+02:00

An HTML5 React Canvas 2D arcade Pang-style game featuring classic explorer 16-bit characters (Rumi, Zoey, Mira) with K-pop themes, custom vertical ladders, platform boundary physics, multi-weapon hooks, power-up chimes, and swaying stage lights.

Working directory: /Users/marcocardoso/DEV/cloudcrush-local
Integrity mode: development

## Requirements

### R1. Premium Pixel-Art Character Evolution
Evolve the procedural 16-bit character sprites (Rumi, Zoey, Mira) on the canvas to be visually sharper, more detailed, and expressive. Refine the hat outlines, shaded fills, hairstyle structures, outfits, and face states. The animation poses (Idle, Walk, Climb, Shoot, and dizzy Recovery) must look highly polished and premium.

### R2. Multi-level Harpoon Shooting Physics (Height Alignment Fix)
Fix the harpoon hook origin and drawing logic. When the player stands on an elevated platform or ledge and shoots a hook, the hook must start growing from the player's active platform height, and the drawn line must terminate at that platform level instead of drawing through the platform down to the bottom floor. All bubble-rope collision bounds must align with the active platform heights.

### R3. Free Movement Shooting Physics
Ensure full horizontal movement and climbing capabilities are maintained while hooks are actively climbing, permitting fluid player responses to bubbles.

## Acceptance Criteria

### Build & Compilation
- [ ] Running `npm run build` succeeds cleanly with zero linting, runtime, or bundler errors.

### Visual Character Quality
- [ ] The character sprite features sharp black outlines and detailed shaded zones for a high-quality 16-bit pith explorer appearance.
- [ ] Render states are correctly mapped for: Walk (swinging legs/arms), Idle (static front view), Climb (back of head facing ladder), Shoot (looking up, aiming up), and dizzy recovery (`x_x` eyes during invulnerability timer).
- [ ] The electric lightning shield aura draws a jagged cyan halo wrapping the player whenever the shield is active.

### Multi-level Hook Alignments
- [ ] Shooting hooks from platform ledges starts the hook line from the player's active height (`p.y + p.height - 5`) rather than the bottom floor.
- [ ] The rope segment chains are drawn cleanly terminating at the player's shooting platform level.
- [ ] Player controls (walking left/right and climbing ladders) remain fully responsive while hooks are active.
