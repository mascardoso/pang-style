# K-Stage Odyssey 🎵👾

**K-Stage Odyssey** is an HTML5 retro-inspired arcade action game built with React and HTML5 Canvas. It features classic bubble-splitting gameplay mechanics reminiscent of the retro game *Pang* (Buster Bros), styled with an upbeat stage-light aesthetic, dynamic 8-bit synthesized soundtracks, and stocky 16-bit chibi characters.

---

## 🚀 Key Features

### 1. Premium 16-Bit Chibi Characters
*   **Rhea**: The pop princess with bouncing pink twin-tails, gold star hairpins, a microphone headset, and white-striped socks.
*   **Zara**: The breakdance star wearing a backward orange cap, neck headphones, a teal hoodie, and blue cargo pants.
*   **Mina**: The cyber rapper wearing a cyber helmet, neon green piping, and a cyan HUD visor with scanlines.
*   *Animation States*: Fully animated Idle (with breathing bob), Walking (2-segment leg movement), Climbing (back-of-head view), Shooting (aiming up with open-mouth gasp), and dizzy Recovery (`x_x` eyes with orbiting stars).
*   *Context Flipping*: Sprites automatically flip horizontally based on keyboard movement inputs so characters naturally face left or right.

### 2. Multi-Level Harpoon Physics
*   **Platform Alignment**: Hooks originate from the player's active height (`p.y + p.height - 5`) rather than the bottom floor.
*   **Dynamic Clipping**: Drawn chains terminate at the player's active shooting platform level instead of drawing through platforms.
*   **Free Movement**: The player maintains full horizontal movement and climbing capabilities while hooks are active.

### 3. Procedural Chiptune Audio Engine
*   **8-Bit Soundtrack**: Synthesizes a syncopated 64-step K-pop chord loop (Am - F - C - G) at 125 BPM using Triangle wave basslines, Square wave leads, and noise percussion (hi-hats and snares) directly via the Web Audio API.
*   **Unique Power-up SFX**:
    *   *Double Hook*: Rapid double-pulse chime.
    *   *Sticky Anchor*: Pitch bend latch sweep.
    *   *Force Shield*: Vibrating LFO sine sweep.
    *   *Time Stop*: Mechanical ticking clocks.
    *   *Life Heart*: Consonant major-third swell.
*   **Pop & Defeat FX**: satisying noise pop bursts for bubbles and detuned descending minor-third sawtooth sweeps for losing lives.
*   **UI Mute Toggle**: Easily mute or unmute the soundtrack via the dashboard control (saved in localStorage).

### 4. Interactive Arcade Dashboard
*   Active scoreboard with stages, score, high-score, elapsed time, and heart-based lives indicator.
*   Controls dashboard and item utility indicators (Double Hook, Sticky Anchor, Shield, Time Stop).

---

## 🎮 Controls

| Action | Primary Keys | Alternative Keys |
| :--- | :--- | :--- |
| **Walk Left / Right** | `A` / `D` | `←` / `→` |
| **Climb Up / Down** | `W` / `S` | `↑` / `↓` |
| **Shoot Weapon** | `Spacebar` | — |

---

## 🛠️ Tech Stack & Architecture

*   **Framework**: React (v19) + Vite
*   **Rendering**: HTML5 Canvas 2D Context (`ctx`)
*   **Physics Loop**: Fixed-timestep game loop locked to 60 ticks/sec (physics decoupled from screen refresh rates).
*   **Audio Synthesis**: Web Audio API (100% synthesized; zero static audio asset requests).
*   **Linting**: Oxlint rules for static code analysis.
*   **Tests**: Playwright E2E automation suites.

---

## 💻 Local Development Setup

### Install Dependencies
```bash
npm install
```

### Run Dev Server
Runs local dev server at `http://localhost:5173/` with HMR active:
```bash
npm run dev
```

### Production Build
Compiles production-ready HTML, CSS, and JS assets to `dist/`:
```bash
npm run build
```

### Run End-to-End Tests
Executes Playwright tests validating game mechanics, UI flow, and canvas integration:
```bash
npm run test:e2e
```
