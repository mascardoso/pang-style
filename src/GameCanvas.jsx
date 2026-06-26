import React, { useEffect, useRef } from 'react';
import { audio } from './audio';

// Constants matching our Go implementation
const screenWidth = 800;
const screenHeight = 600;
const ceilingY = 45;
const floorY = 580;
const leftWallX = 10;
const rightWallX = 790;
const gravity = 0.16;

export default function GameCanvas({
  character,
  isPlaying,
  level,
  lives,
  score,
  onScoreChange,
  onLivesChange,
  onLevelClear,
  onGameOver,
  onWeaponChange,
  onShieldChange,
  onTimeFreezeChange,
}) {
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

  // Keep state refs in sync with props
  useEffect(() => {
    gameStateRef.current.level = level;
    gameStateRef.current.score = score;
    gameStateRef.current.lives = lives;
  }, [level, score, lives]);

  // Load image assets and key them
  useEffect(() => {
    const state = gameStateRef.current;
    const base = import.meta.env.BASE_URL || '/';
    
    const loadBg = (fileName, bgIdx) => {
      const img = new Image();
      img.onload = () => {
        state.backgrounds[bgIdx] = img;
      };
      // Ensure we don't end up with double slashes if base ends with a slash
      const cleanBase = base.endsWith('/') ? base : base + '/';
      img.src = `${cleanBase}${fileName}`;
    };

    loadBg('background_coex.jpg', 1);
    loadBg('background_myeongdong.jpg', 2);
    loadBg('background_nseoul.jpg', 3);
  }, []);

  // Initialize level platforms, ladders, player and bubbles
  const initLevel = (lvl) => {
    const state = gameStateRef.current;
    state.bubbles = [];
    state.particles = [];
    state.ropes = [];
    state.powerups = [];
    state.timeFreezeTimer = 0;
    
    // Reset player specs
    state.player.width = 36;
    state.player.height = 56;
    state.player.x = (screenWidth - state.player.width) / 2;
    state.player.y = floorY - state.player.height;
    state.player.invulnTimer = 60; 
    state.player.weapon = 'single';
    state.player.facing = 'right';
    state.player.shieldActive = false;
    state.player.isClimbing = false;
    state.player.onGround = true;
    state.player.vy = 0;

    // Sync callbacks
    onWeaponChange('single');
    onShieldChange(false);
    onTimeFreezeChange(false);

    // Platform and Ladder definitions for levels
    state.platforms = [];
    state.ladders = [];

    switch (lvl) {
      case 1:
        // Level 1: One center platform, two side ladders
        state.platforms.push({ x1: 220, x2: 580, y: 350, h: 18 });
        state.ladders.push(
          { x: 260, y1: 350, y2: floorY },
          { x: 540, y1: 350, y2: floorY }
        );
        state.bubbles.push(
          { x: 200, y: 150, vx: 1.8, vy: 0, size: 2, radius: 32 },
          { x: 600, y: 150, vx: -1.8, vy: 0, size: 2, radius: 32 }
        );
        break;
      case 2:
        // Level 2: Left and right platforms, high center platform
        state.platforms.push(
          { x1: leftWallX, x2: 300, y: 360, h: 18 },
          { x1: 500, x2: rightWallX, y: 360, h: 18 },
          { x1: 320, x2: 480, y: 200, h: 18 }
        );
        state.ladders.push(
          { x: 240, y1: 360, y2: floorY },
          { x: 560, y1: 360, y2: floorY },
          { x: 400, y1: 200, y2: floorY }
        );
        state.bubbles.push(
          { x: 150, y: 150, vx: 2.0, vy: 0, size: 2, radius: 32 },
          { x: 650, y: 150, vx: -2.0, vy: 0, size: 2, radius: 32 },
          { x: 400, y: 100, vx: 1.5, vy: -2.0, size: 1, radius: 16 }
        );
        break;
      case 3:
        // Level 3: Dual tiered platforms connected via offset ladders
        state.platforms.push(
          { x1: 150, x2: 650, y: 400, h: 18 },
          { x1: 300, x2: 500, y: 220, h: 18 }
        );
        state.ladders.push(
          { x: 200, y1: 400, y2: floorY },
          { x: 600, y1: 400, y2: floorY },
          { x: 400, y1: 220, y2: 400 }
        );
        state.bubbles.push(
          { x: 200, y: 120, vx: 1.8, vy: 0, size: 2, radius: 32 },
          { x: 400, y: 180, vx: -2.2, vy: 0, size: 2, radius: 32 },
          { x: 600, y: 120, vx: 1.8, vy: 0, size: 2, radius: 32 }
        );
        break;
      default:
        // Default Stage (cycles platforms/ladders)
        state.platforms.push({ x1: 180, x2: 620, y: 320, h: 18 });
        state.ladders.push({ x: 400, y1: 320, y2: floorY });
        for (let i = 0; i < Math.min(lvl - 1, 6); i++) {
          const vx = i % 2 === 1 ? -2.0 : 2.0;
          const xPos = 150 + (i * 140) % (rightWallX - leftWallX - 100);
          state.bubbles.push({
            x: xPos,
            y: 100 + i * 30,
            vx: vx,
            vy: 0,
            size: 2,
            radius: 32,
          });
        }
        break;
    }

    // Initialize ambient blossom petals if not done
    if (!state.blossoms) {
      state.blossoms = [];
      for (let i = 0; i < 20; i++) {
        state.blossoms.push({
          x: Math.random() * screenWidth,
          y: ceilingY + Math.random() * (floorY - ceilingY - 100),
          r: 2 + Math.random() * 4,
          vx: 0.8 + Math.random() * 1.5,
          vy: 0.4 + Math.random() * 0.8,
          wobble: Math.random() * Math.PI * 2,
        });
      }
    }
  };

  useEffect(() => {
    if (isPlaying) {
      initLevel(level);
    }
  }, [level, isPlaying]);

  // Main execution loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let animId;
    const state = gameStateRef.current;

    const handleKeyDown = (e) => {
      state.keysPressed[e.code] = true;
      if (e.code === 'Space' && isPlaying && state.lives > 0) {
        e.preventDefault();
        fireWeapon();
      }
    };
    
    const handleKeyUp = (e) => {
      state.keysPressed[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Fire hook (locked when rope is growing, except for double hooks)
    const fireWeapon = () => {
      const p = state.player;
      
      const maxRopes = p.weapon === 'double' ? 2 : 1;
      const activeCount = state.ropes.length;

      if (p.weapon !== 'double') {
        const hasGrowingRope = state.ropes.some(r => !r.anchored);
        if (hasGrowingRope) return;
      }

      if (activeCount < maxRopes) {
        audio.playShoot();
        state.ropes.push({
          x: p.x + p.width / 2,
          y: p.y + p.height - 5,
          anchored: false,
          anchorTimer: 0,
          startY: p.y + p.height - 5, // Track which platform level it shot from
        });
      }
    };

    const spawnExplosion = (x, y, color, count) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * 2.0 * Math.PI;
        const speed = 1.0 + Math.random() * 4.0;
        const pType = Math.random() < 0.45 ? 'note' : Math.random() < 0.75 ? 'star' : 'spark';
        state.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.2,
          life: 30 + Math.floor(Math.random() * 20),
          maxLife: 50,
          color,
          size: 2.0 + Math.random() * 3.5,
          type: pType,
        });
      }
    };

    const spawnSparks = (x, y, color) => {
      for (let i = 0; i < 3; i++) {
        const vx = (Math.random() - 0.5) * 3.0;
        const vy = -0.5 - Math.random() * 2.0;
        state.particles.push({
          x,
          y,
          vx,
          vy,
          life: 12 + Math.floor(Math.random() * 10),
          maxLife: 22,
          color,
          size: 1.0 + Math.random() * 1.5,
          type: 'spark',
        });
      }
    };

    const getBounceSpeed = (size) => {
      if (size === 2) return 10.5; // Large
      if (size === 1) return 8.5;  // Medium
      return 6.5;                  // Small
    };

    // Helper checks
    const checkLadderOverlap = (p, ladders) => {
      const pxCenter = p.x + p.width / 2;
      for (let i = 0; i < ladders.length; i++) {
        const lad = ladders[i];
        if (Math.abs(pxCenter - lad.x) < 25) {
          if (p.y + p.height >= lad.y1 && p.y <= lad.y2) {
            return lad;
          }
        }
      }
      return null;
    };

    const checkPlatformLanding = (p, platforms) => {
      const pxCenter = p.x + p.width / 2;
      const pBottom = p.y + p.height;
      for (let i = 0; i < platforms.length; i++) {
        const plat = platforms[i];
        if (pxCenter >= plat.x1 && pxCenter <= plat.x2) {
          // If falling through the top edge
          if (pBottom >= plat.y && pBottom <= plat.y + 12 && p.vy >= 0) {
            return plat;
          }
        }
      }
      return null;
    };

    // Update state physics
    const updatePhysics = () => {
      if (!isPlaying || state.lives <= 0) return;

      const p = state.player;
      
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
          p.facing = 'left';
        }
        if (state.keysPressed['ArrowRight'] || state.keysPressed['KeyD']) {
          p.x += p.speed;
          isMovingHorizontally = true;
          p.facing = 'right';
        }
      }

      // Handle walk timer for leg animations
      const isMovingVertically = p.isClimbing && 
        (state.keysPressed['ArrowUp'] || state.keysPressed['KeyW'] || state.keysPressed['ArrowDown'] || state.keysPressed['KeyS']);

      if (isMovingHorizontally) {
        p.walkTimer = (p.walkTimer || 0) + 0.22;
      } else if (isMovingVertically) {
        p.walkTimer = (p.walkTimer || 0) + 0.18;
      } else {
        p.walkTimer = 0;
      }

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

      // Apply player gravity if not climbing
      if (!p.isClimbing) {
        p.vy += gravity;
        p.y += p.vy;

        // Ground landing
        if (p.y + p.height >= floorY) {
          p.y = floorY - p.height;
          p.vy = 0;
          p.onGround = true;
        } else {
          // Platform landing check
          const landedPlat = checkPlatformLanding(p, state.platforms);
          if (landedPlat) {
            p.y = landedPlat.y - p.height;
            p.vy = 0;
            p.onGround = true;
          } else {
            p.onGround = false;
          }
        }
      }

      // Clamp Player inside left/right walls
      if (p.x < leftWallX + 4) p.x = leftWallX + 4;
      if (p.x > rightWallX - 4 - p.width) p.x = rightWallX - 4 - p.width;

      if (p.invulnTimer > 0) p.invulnTimer--;

      // Update Time Freeze Hourglass
      if (state.timeFreezeTimer > 0) {
        state.timeFreezeTimer--;
        if (state.timeFreezeTimer === 0) {
          onTimeFreezeChange(false);
        }
      }

      // Update Ambient blossoms
      if (state.blossoms) {
        state.blossoms.forEach(b => {
          b.x += b.vx;
          b.y += b.vy;
          b.wobble += 0.04;
          b.x += Math.sin(b.wobble) * 0.25;
          
          if (b.x > rightWallX + 10 || b.y > floorY) {
            b.x = leftWallX - 10 + Math.random() * 30;
            b.y = ceilingY + Math.random() * (floorY - ceilingY - 100);
          }
        });
      }

      // Update Ropes
      const speed = 14.5;
      const activeRopes = [];
      for (let i = 0; i < state.ropes.length; i++) {
        const r = state.ropes[i];
        if (r.anchored) {
          r.anchorTimer--;
          if (r.anchorTimer > 0) {
            activeRopes.push(r);
          }
        } else {
          r.y -= speed;
          
          // Check if rope tip intersects ceiling or any platform bottom
          let hitPlatformBottom = false;
          let capY = ceilingY;

          if (r.y <= ceilingY) {
            hitPlatformBottom = true;
            capY = ceilingY;
          } else {
            for (let j = 0; j < state.platforms.length; j++) {
              const plat = state.platforms[j];
              if (r.x >= plat.x1 && r.x <= plat.x2) {
                // If tip crosses below bottom of platform Y + h and rope started below the platform
                if (r.y <= plat.y + plat.h && r.startY > plat.y + plat.h) {
                  hitPlatformBottom = true;
                  capY = plat.y + plat.h;
                  break;
                }
              }
            }
          }

          if (hitPlatformBottom) {
            if (p.weapon === 'sticky') {
              r.y = capY;
              r.anchored = true;
              r.anchorTimer = 210; // 3.5 seconds
              activeRopes.push(r);
              spawnExplosion(r.x, capY + 4, '#e0f0ff', 8);
            } else {
              // Standard rope dissolves
              spawnExplosion(r.x, capY + 4, '#00f0ff', 8);
            }
          } else {
            if (Math.random() < 0.35) {
              spawnSparks(r.x, r.y, 'rgba(255, 255, 255, 0.8)');
            }
            activeRopes.push(r);
          }
        }
      }
      state.ropes = activeRopes;

      // Update Bouncing Bubbles
      const frozen = state.timeFreezeTimer > 0;
      for (let i = 0; i < state.bubbles.length; i++) {
        const b = state.bubbles[i];
        if (!frozen) {
          b.x += b.vx;
          b.vy += gravity;
          b.y += b.vy

          // Bounce wall/floor
          if (b.x - b.radius <= leftWallX) {
            b.x = leftWallX + b.radius;
            b.vx = -b.vx;
          }
          if (b.x + b.radius >= rightWallX) {
            b.x = rightWallX - b.radius;
            b.vx = -b.vx;
          }
          if (b.y + b.radius >= floorY) {
            b.y = floorY - b.radius;
            b.vy = -getBounceSpeed(b.size);
          }
          if (b.y - b.radius <= ceilingY) {
            b.y = ceilingY + b.radius;
            b.vy = Math.abs(b.vy);
          }

          // Bounce off platforms!
          state.platforms.forEach(plat => {
            if (b.x + b.radius >= plat.x1 && b.x - b.radius <= plat.x2) {
              // 1. Bounce off platform top (falling down)
              if (b.y + b.radius >= plat.y && b.y < plat.y && b.vy >= 0) {
                b.y = plat.y - b.radius;
                b.vy = -getBounceSpeed(b.size);
              }
              // 2. Bounce off platform bottom (rising up)
              else if (b.y - b.radius <= plat.y + plat.h && b.y > plat.y + plat.h && b.vy < 0) {
                b.y = plat.y + plat.h + b.radius;
                b.vy = Math.abs(b.vy); // Push down
              }
            }
          });
        }
      }

      // Update falling power-ups
      const activePowerups = [];
      for (let i = 0; i < state.powerups.length; i++) {
        const item = state.powerups[i];
        item.y += 2.0;
        
        // Collsion with player AABB
        if (
          item.x + 12 >= p.x &&
          item.x - 12 <= p.x + p.width &&
          item.y + 12 >= p.y &&
          item.y - 12 <= p.y + p.height
        ) {
          audio.playPowerUp(item.type);
          
          if (item.type === 'double_hook') {
            p.weapon = 'double';
            onWeaponChange('double');
          }
          if (item.type === 'sticky_hook') {
            p.weapon = 'sticky';
            onWeaponChange('sticky');
          }
          if (item.type === 'shield') {
            p.shieldActive = true;
            onShieldChange(true);
          }
          if (item.type === 'hourglass') {
            state.timeFreezeTimer = 240;
            onTimeFreezeChange(true);
          }
          if (item.type === 'heart') {
            onLivesChange(state.lives + 1);
          }
          
          spawnExplosion(item.x, item.y, '#adff2f', 8);
        } else if (item.y - 12 <= floorY) {
          // Landing on platforms
          let landedPlat = false;
          for (let j = 0; j < state.platforms.length; j++) {
            const plat = state.platforms[j];
            if (item.x >= plat.x1 && item.x <= plat.x2 && item.y + 12 >= plat.y && item.y <= plat.y + 6) {
              item.y = plat.y - 12;
              landedPlat = true;
              break;
            }
          }
          if (landedPlat) {
            // Keep power-up static on platform
            activePowerups.push(item);
          } else {
            activePowerups.push(item);
          }
        }
      }
      state.powerups = activePowerups;

      // Update particles
      const activeParticles = [];
      for (let i = 0; i < state.particles.length; i++) {
        const pt = state.particles[i];
        pt.x += pt.vx;
        pt.vy += 0.04;
        pt.y += pt.vy;
        pt.life--;
        if (pt.life > 0) activeParticles.push(pt);
      }
      state.particles = activeParticles;

      // Rope vs Bubble Collisions
      for (let rIdx = 0; rIdx < state.ropes.length; rIdx++) {
        const rp = state.ropes[rIdx];
        let hitIdx = -1;
        
        for (let bIdx = 0; bIdx < state.bubbles.length; bIdx++) {
          const b = state.bubbles[bIdx];
          if (Math.abs(b.x - rp.x) <= b.radius) {
            if (b.y + b.radius >= rp.y && b.y - b.radius <= rp.startY) {
              hitIdx = bIdx;
              break;
            }
          }
        }

        if (hitIdx !== -1) {
          state.ropes.splice(rIdx, 1);
          rIdx--;

          const hitB = state.bubbles[hitIdx];
          state.bubbles.splice(hitIdx, 1);

          audio.playPop();

          let splitColor = '#adff2f';
          let points = 100;

          if (hitB.size === 2) {
            splitColor = '#00f0ff';
            points = 100;
            state.bubbles.push(
              { x: hitB.x, y: hitB.y, vx: -1.8, vy: -5.5, size: 1, radius: 16 },
              { x: hitB.x, y: hitB.y, vx: 1.8, vy: -5.5, size: 1, radius: 16 }
            );
          } else if (hitB.size === 1) {
            splitColor = '#ff007f';
            points = 200;
            state.bubbles.push(
              { x: hitB.x, y: hitB.y, vx: -2.4, vy: -4.5, size: 0, radius: 8 },
              { x: hitB.x, y: hitB.y, vx: 2.4, vy: -4.5, size: 0, radius: 8 }
            );
          } else {
            points = 400;
          }

          onScoreChange(state.score + points);
          spawnExplosion(hitB.x, hitB.y, splitColor, 16);

          if (Math.random() < 0.25) {
            const types = ['double_hook', 'sticky_hook', 'shield', 'hourglass', 'heart'];
            const randIdx = Math.random() < 0.08 ? 4 : Math.floor(Math.random() * 4);
            state.powerups.push({
              x: hitB.x,
              y: hitB.y,
              vy: 2.0,
              type: types[randIdx],
            });
          }
          break;
        }
      }

      // Player vs Bubble Collision
      if (p.invulnTimer <= 0) {
        for (let i = 0; i < state.bubbles.length; i++) {
          const b = state.bubbles[i];
          const closestX = Math.max(p.x, Math.min(b.x, p.x + p.width));
          const closestY = Math.max(p.y, Math.min(b.y, p.y + p.height));

          const dx = b.x - closestX;
          const dy = b.y - closestY;
          const distSq = dx * dx + dy * dy;

          if (distSq <= b.radius * b.radius) {
            if (p.shieldActive) {
              p.shieldActive = false;
              onShieldChange(false);
              p.invulnTimer = 60;
              audio.playHit();
              spawnExplosion(p.x + p.width / 2, p.y + p.height / 2, '#adff2f', 20);
            } else {
              audio.playHit();
              spawnExplosion(p.x + p.width / 2, p.y + p.height / 2, 'rgba(255, 50, 50, 0.8)', 25);
              const nextLives = state.lives - 1;
              onLivesChange(nextLives);
              
              if (nextLives <= 0) {
                onGameOver();
              } else {
                initLevel(state.level);
              }
            }
            break;
          }
        }
      }

      // Level Clear
      if (state.bubbles.length === 0 && isPlaying) {
        audio.playLevelUp();
        onLevelClear();
      }
    };

    // Helper to draw crisp pixel-art sprites using a pixel grid
    // Each character pose is a 2D array of color codes mapped to a palette
    // Helper to draw crisp pixel-art sprites using a pixel grid
    // Each character pose is a 2D array of color codes mapped to a palette
    const drawProceduralPlayer = (ctx, p, character, state) => {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      
      const px = p.x;
      const py = p.y;
      const pw = p.width;
      const ph = p.height;
      
      // Determine Pose States
      const isClimbing = p.isClimbing;
      const isShooting = state.ropes.some(r => !r.anchored);
      const isWalking = p.onGround && !isClimbing && 
        (state.keysPressed['ArrowLeft'] || state.keysPressed['KeyA'] || state.keysPressed['ArrowRight'] || state.keysPressed['KeyD']);
      const isDizzy = p.invulnTimer > 40;
      const isShielded = p.shieldActive;
      const walkTimer = p.walkTimer || 0;
      const walkFrame = Math.floor(walkTimer * 1.5) % 2; // 0 or 1
      
      // Color palettes per character
      const palettes = {
        rhea: {
          S: '#ffdbac', // skin
          s: '#e0a96d', // skin shadow
          H: '#ff007f', // hair
          h: '#be185d', // hair dark
          O: '#ffffff', // outfit top
          o: '#f472b6', // outfit bottom (skirt)
          A: '#ff007f', // accent
          B: '#be185d', // boots
          W: '#ffffff', // eye white
          P: '#1e1b4b', // pupil
          G: '#eab308', // gold pins
          K: '#000000', // outline
          T: '#ffffff', // sock
        },
        zara: {
          S: '#ffdbac',
          s: '#e0a96d',
          H: '#78350f', // brown hair
          h: '#451a03',
          O: '#0d9488', // teal hoodie
          o: '#1d4ed8', // blue pants
          A: '#ea580c', // orange accent
          B: '#0f172a', // dark boots
          W: '#ffffff',
          P: '#1e1b4b',
          G: '#fbbf24', // gold zipper
          K: '#000000',
          T: '#0d9488',
          M: '#ea580c', // cap color
        },
        mina: {
          S: '#c4b5fd', // pale purple skin
          s: '#a78bfa',
          H: '#c084fc', // purple hair
          h: '#7e22ce',
          O: '#1e1b4b', // dark bodysuit
          o: '#1e1b4b',
          A: '#22c55e', // green piping
          B: '#22c55e', // green boots
          W: '#00f0ff', // visor glow
          P: '#00f0ff',
          G: '#3b0764', // helmet purple
          K: '#000000',
          T: '#1e1b4b',
          M: '#22c55e',
        },
      };
      
      const pal = palettes[character] || palettes.zara;
      const _ = null; // transparent
      
      // Sprite definitions: 16 wide x 20 tall pixel grids (stocky chibi proportions facing right)
      const getIdleSprite = () => {
        if (character === 'rhea') {
          return [
            // Row 0-2: Hair top + bows
            [_,_,_,_,_,'H','H','H','H','H','H',_,_,_,_,_],
            [_,_,_,'G','H','H','H','H','H','H','H','H','G',_,_,_],
            [_,_,'H','H','H','H','H','H','H','H','H','H','H','H',_,_],
            // Row 3-4: Bangs + face top
            [_,_,'H','H','H','S','S','S','S','S','S','S','H','H',_,_],
            [_,_,'H','H','S','S','S','S','S','S','S','S','S','H',_,_],
            // Row 5-6: Eyes (facing right)
            [_,_,'H','S','S','S','S','S','W','W','S','W','W','S',_,_],
            [_,_,'H','S','S','S','S','S','W','P','S','W','P','S',_,_],
            // Row 7: Blush/Mouth
            [_,_,_,'S','S','S','S','S','S','A','S','S','S',_,_,_],
            // Row 8: Chin/Neck/Twin tails start
            [_,'H','H',_,_,'S','S','S','S','S','S',_,_,'H','H',_],
            // Row 9-11: Torso
            ['H','H',_,_,'A','O','O','O','O','O','A',_,_,'H','H'],
            [_,_,_,_,'A','O','O','O','O','O','A',_,_,_,_,_],
            [_,_,_,_,'O','O','O','O','O','O','O',_,_,_,_,_],
            // Row 12-13: Skirt
            [_,_,_,'o','o','o','o','o','o','o','o','o','o',_,_,_],
            [_,_,'o','o','o','o','o','o','o','o','o','o','o','o',_,_],
            // Row 14-15: Legs (white socks)
            [_,_,_,_,'T','T','T',_,_,_,'T','T','T',_,_,_,_],
            [_,_,_,_,'T','T','T',_,_,_,'T','T','T',_,_,_,_],
            // Row 16-17: Socks with stripe
            [_,_,_,_,'A','T','T',_,_,_,'T','T','A',_,_,_,_],
            [_,_,_,_,'T','T','T',_,_,_,'T','T','T',_,_,_,_],
            // Row 18-19: Pink boots (thick and stocky)
            [_,_,_,'B','B','B','B',_,_,'B','B','B','B',_,_,_],
            [_,_,_,'B','B','B','B',_,_,'B','B','B','B',_,_,_],
          ];
        } else if (character === 'mina') {
          return [
            // Row 0-2: Helmet top
            [_,_,_,_,_,'G','G','G','G','G','G',_,_,_,_,_],
            [_,_,_,_,'G','G','A','A','A','A','G','G',_,_,_,_],
            [_,_,_,'G','G','H','H','H','H','H','H','G','G',_,_,_],
            // Row 3-4: Visor/helmet front
            [_,_,'H','H','H','S','S','S','S','S','S','S','H','H',_,_],
            [_,_,'H','H','S','S','S','S','S','S','S','S','S','H',_,_],
            // Row 5-6: Glowing Visor
            [_,_,'H','S','S','W','W','W','W','W','W','W','W','S',_,_],
            [_,_,'H','S','S','W','K','W','K','W','K','W','W','S',_,_],
            // Row 7: Lower face
            [_,_,_,'S','S','S','S','S','S','K','S','S','S',_,_,_],
            // Row 8: Neck
            [_,_,_,_,_,'S','S','O','O','S','S',_,_,_,_,_],
            // Row 9-11: Torso (cyber suit + neon lines)
            [_,_,_,'G','A','O','O','O','O','O','O','A','G',_,_,_],
            [_,_,_,'G','O','A','O','O','O','A','O','G',_,_,_],
            [_,_,_,_,'O','O','A','O','O','A','O',_,_,_,_,_],
            // Row 12-13: Lower suit
            [_,_,_,_,'O','O','O','O','O','O','O',_,_,_,_,_],
            [_,_,_,_,'O','O','O','O','O','O','O',_,_,_,_,_],
            // Row 14-17: Legs
            [_,_,_,_,'O','O','O',_,_,_,'O','O','O',_,_,_,_],
            [_,_,_,_,'O','O','O',_,_,_,'O','O','O',_,_,_,_],
            [_,_,_,_,'A','O','O',_,_,_,'O','O','A',_,_,_,_],
            [_,_,_,_,'O','O','O',_,_,_,'O','O','O',_,_,_,_],
            // Row 18-19: Green boots
            [_,_,_,'B','B','B','B',_,_,'B','B','B','B',_,_,_],
            [_,_,_,'B','B','B','B',_,_,'B','B','B','B',_,_,_],
          ];
        } else {
          // Zara
          return [
            // Row 0-2: Cap dome (wide)
            [_,_,_,_,_,'M','M','M','M','M','M','M',_,_,_,_],
            [_,_,_,_,'M','M','M','M','M','M','M','M','M',_,_,_],
            [_,_,'M','M','M','M','M','M','M','M','M','M','M','M',_,_],
            // Row 3-4: Cap brim pointing right + hair/face
            [_,_,'H','H','H','H','S','S','S','S','S','M','M','M','M',_],
            [_,_,'H','H','H','S','S','S','S','S','S','S','S','H',_,_],
            // Row 5-6: Eyes facing right
            [_,_,'H','H','S','S','S','S','W','W','S','W','W','S',_,_],
            [_,_,'H','H','S','S','S','S','W','P','S','W','P','S',_,_],
            // Row 7: Mouth / Headphones band
            [_,_,_,'H','S','S','S','S','S','S','K','S','S',_,_,_],
            // Row 8: Neck + headphones earcups
            [_,_,_,'M',_,'S','S','S','S','S','S',_,'M',_,_,_],
            // Row 9-11: Torso (hoodie)
            [_,_,_,'A','O','O','O','O','O','O','O','A',_,_,_,_],
            [_,_,_,'A','O','O','O','G','O','O','O','A',_,_,_,_],
            [_,_,_,_,'O','O','O','G','O','O','O',_,_,_,_,_],
            // Row 12-13: Hoodie lower edge
            [_,_,_,_,'O','O','O','O','O','O','O',_,_,_,_,_],
            [_,_,_,_,'O','O','O','O','O','O','O',_,_,_,_,_],
            // Row 14-17: Pants (blue, thick cargo look)
            [_,_,_,_,'o','o','o',_,_,_,'o','o','o',_,_,_,_],
            [_,_,_,_,'o','o','o',_,_,_,'o','o','o',_,_,_,_],
            [_,_,_,_,'o','o','o',_,_,_,'o','o','o',_,_,_,_],
            [_,_,_,_,'o','o','o',_,_,_,'o','o','o',_,_,_,_],
            // Row 18-19: Boots
            [_,_,_,'B','B','B','B',_,_,'B','B','B','B',_,_,_],
            [_,_,_,'B','B','B','B',_,_,'B','B','B','B',_,_,_],
          ];
        }
      };
      
      const getWalkSprite = (frame) => {
        const idle = getIdleSprite();
        const sprite = idle.map(row => [...row]);
        if (frame === 0) {
          // Left leg forward, right leg back
          if (sprite[14]) { sprite[14] = [_,_,_,'o','o','o',_,_,_,_,'o','o','o',_,_,_]; }
          if (sprite[15]) { sprite[15] = [_,_,'o','o','o',_,_,_,_,_,_,'o','o','o',_,_]; }
          if (sprite[16]) { sprite[16] = [_,_,'o','o','o',_,_,_,_,_,_,'o','o','o',_,_]; }
          if (sprite[17]) { sprite[17] = [_,_,'o','o','o',_,_,_,_,_,_,'o','o','o',_,_]; }
          if (sprite[18]) { sprite[18] = [_,'B','B','B','B',_,_,_,_,_,'B','B','B','B',_]; }
          if (sprite[19]) { sprite[19] = [_,'B','B','B','B',_,_,_,_,_,'B','B','B','B',_]; }
        } else {
          // Right leg forward, left leg back
          if (sprite[14]) { sprite[14] = [_,_,_,_,'o','o','o',_,_,_,'o','o','o',_,_,_]; }
          if (sprite[15]) { sprite[15] = [_,_,_,_,'o','o','o',_,_,_,'o','o','o',_,_,_]; }
          if (sprite[16]) { sprite[16] = [_,_,_,_,'o','o','o',_,_,_,'o','o','o',_,_,_]; }
          if (sprite[17]) { sprite[17] = [_,_,_,_,'o','o','o',_,_,_,'o','o','o',_,_,_]; }
          if (sprite[18]) { sprite[18] = [_,_,_,'B','B','B','B',_,_,'B','B','B','B',_,_]; }
          if (sprite[19]) { sprite[19] = [_,_,_,'B','B','B','B',_,_,'B','B','B','B',_,_]; }
        }
        
        // Character-specific leg colors
        const pant = character === 'rhea' ? 'T' : character === 'mina' ? 'O' : 'o';
        for (let r = 14; r <= 17; r++) {
          if (sprite[r]) sprite[r] = sprite[r].map(c => c === 'o' ? pant : c);
        }
        return sprite;
      };
      
      const getShootSprite = () => {
        const idle = getIdleSprite();
        const sprite = idle.map(row => [...row]);
        if (character !== 'mina') {
          if (sprite[5]) sprite[5] = [_,_,'H','S','S','S','S','S','W','P','S','W','P','S',_,_];
          if (sprite[6]) sprite[6] = [_,_,'H','S','S','S','S','S','W','W','S','W','W','S',_,_];
          if (sprite[7]) {
            sprite[7] = [_,_,_,'S','S','S','S','S','S','K','K','S','S',_,_,_];
          }
        }
        return sprite;
      };
      
      const getClimbSprite = () => {
        const hair = 'H';
        const hairD = 'h';
        const outfit = 'O';
        const pant = character === 'rhea' ? 'T' : character === 'mina' ? 'O' : 'o';
        const climbFrame = Math.floor(walkTimer * 2.0) % 2;
        
        const base = [
          // Row 0-2: Hair back
          [_,_,_,_,_,'H','H','H','H','H','H',_,_,_,_,_],
          [_,_,_,'h','H','H','H','H','H','H','H','h',_,_,_,_],
          [_,_,'H','H','H','H','H','H','H','H','H','H','H','H',_,_],
          // Row 3-7: Hair back details
          [_,_,'H','H','h','H','h','H','h','H','h','H','H','H',_,_],
          [_,_,'H','h','H','h','H','h','H','h','H','h','H','h',_,_],
          [_,_,'h','H','h','H','h','H','h','H','h','H','h','H',_,_],
          [_,_,'H','h','H','h','H','h','H','h','H','h','H','H',_,_],
          [_,_,_,'H','H','H','H','H','H','H','H','H','H',_,_,_],
          // Row 8: Neck
          [_,_,_,_,_,'S','S','S','S','S','S',_,_,_,_,_],
          // Row 9-13: Torso back
          [_,_,_,'O','O','O','O','O','O','O','O','O',_,_,_,_],
          [_,_,_,'O','O','O','O','O','O','O','O','O',_,_,_,_],
          [_,_,_,'O','O','O','O','O','O','O','O','O',_,_,_,_],
          [_,_,_,_,'O','O','O','O','O','O','O',_,_,_,_,_],
          [_,_,_,_,'O','O','O','O','O','O','O',_,_,_,_,_],
          // Row 14-17: Legs alternate
          ...(climbFrame === 0 ? [
            [_,_,_,'o','o','o',_,_,_,_,'o','o','o',_,_,_],
            [_,_,'o','o','o',_,_,_,_,_,_,'o','o','o',_,_],
            [_,_,'o','o','o',_,_,_,_,_,_,'o','o','o',_,_],
            [_,_,'o','o','o',_,_,_,_,_,_,'o','o','o',_,_],
          ] : [
            [_,_,_,_,'o','o','o',_,_,_,'o','o','o',_,_,_],
            [_,_,_,_,'o','o','o',_,_,_,'o','o','o',_,_,_],
            [_,_,_,_,'o','o','o',_,_,_,'o','o','o',_,_,_],
            [_,_,_,_,'o','o','o',_,_,_,'o','o','o',_,_,_],
          ]),
          // Row 18-19: Boots
          ...(climbFrame === 0 ? [
            [_,'B','B','B','B',_,_,_,_,_,'B','B','B','B',_],
            [_,'B','B','B','B',_,_,_,_,_,'B','B','B','B',_],
          ] : [
            [_,_,_,'B','B','B','B',_,_,'B','B','B','B',_,_],
            [_,_,_,'B','B','B','B',_,_,'B','B','B','B',_,_],
          ]),
        ];
        
        for (let r = 14; r <= 17; r++) {
          base[r] = base[r].map(c => c === 'o' ? pant : c);
        }
        
        if (character === 'zara') {
          base[0] = [_,_,_,_,_,'M','M','M','M','M','M','M',_,_,_,_];
          base[1] = [_,_,_,_,'M','M','M','M','M','M','M','M','M',_,_,_];
          base[2] = [_,_,'M','M','M','M','M','M','M','M','M','M','M','M',_,_];
        } else if (character === 'mina') {
          base[0] = [_,_,_,_,_,'G','G','G','G','G','G',_,_,_,_,_];
          base[1] = [_,_,_,_,'G','G','A','A','A','A','G','G',_,_,_,_];
          base[2] = [_,_,'G','G','H','H','H','H','H','H','G','G',_,_];
        }
        
        return base;
      };
      
      const getDizzySprite = () => {
        const idle = getIdleSprite();
        const sprite = idle.map(row => [...row]);
        if (character === 'mina') {
          if (sprite[5]) sprite[5] = [_,_,'H','S','S','K','W','K','W','K','W','K','W','S',_,_];
          if (sprite[6]) sprite[6] = [_,_,'H','S','S','W','K','W','K','W','K','W','K','W','S',_,_];
        } else {
          if (sprite[5]) sprite[5] = [_,_,'H','S','S','S','S','S','K','S','K','K','S','K',_,_];
          if (sprite[7]) sprite[7] = [_,_,_,'S','S','S','S','S','K','S','K','S','S',_,_,_];
        }
        return sprite;
      };
      
      let sprite;
      if (isDizzy) {
        sprite = getDizzySprite();
      } else if (isClimbing) {
        sprite = getClimbSprite();
      } else if (isShooting) {
        sprite = getShootSprite();
      } else if (isWalking) {
        sprite = getWalkSprite(walkFrame);
      } else {
        sprite = getIdleSprite();
      }
      
      const spriteW = 16;
      const spriteH = 20;
      const pixW = pw / spriteW;
      const pixH = ph / spriteH;
      
      let offsetY = 0;
      if (isWalking) {
        offsetY = Math.sin(walkTimer * 3.0) * 1.2;
      }
      if (!isWalking && !isClimbing && !isShooting && !isDizzy) {
        offsetY = Math.sin(Date.now() * 0.005) * 0.5;
      }
      
      let offsetX = 0;
      if (isDizzy) {
        offsetX = Math.sin(Date.now() * 0.015) * 3;
      }
      
      // Apply horizontal flip if facing left
      const isFacingLeft = p.facing === 'left';
      if (isFacingLeft && !isClimbing) {
        ctx.translate(px + pw / 2, py + ph / 2);
        ctx.scale(-1, 1);
        ctx.translate(-(px + pw / 2), -(py + ph / 2));
      }
      
      // Draw the sprite pixel by pixel
      for (let row = 0; row < spriteH; row++) {
        for (let col = 0; col < spriteW; col++) {
          const key = sprite[row] && sprite[row][col];
          if (!key) continue;
          
          const color = pal[key] || key;
          ctx.fillStyle = color;
          ctx.fillRect(
            Math.floor(px + col * pixW + offsetX),
            Math.floor(py + row * pixH + offsetY),
            Math.ceil(pixW),
            Math.ceil(pixH)
          );
        }
      }
      
      // Draw black outline
      ctx.fillStyle = '#000000';
      for (let row = 0; row < spriteH; row++) {
        for (let col = 0; col < spriteW; col++) {
          const key = sprite[row] && sprite[row][col];
          if (!key) continue;
          
          const top = row > 0 && sprite[row - 1] && sprite[row - 1][col];
          const bot = row < spriteH - 1 && sprite[row + 1] && sprite[row + 1][col];
          const lft = col > 0 && sprite[row][col - 1];
          const rgt = col < spriteW - 1 && sprite[row][col + 1];
          
          const bx = Math.floor(px + col * pixW + offsetX);
          const by = Math.floor(py + row * pixH + offsetY);
          const bw = Math.ceil(pixW);
          const bh = Math.ceil(pixH);
          
          if (!top) ctx.fillRect(bx, by, bw, 1);
          if (!bot) ctx.fillRect(bx, by + bh - 1, bw, 1);
          if (!lft) ctx.fillRect(bx, by, 1, bh);
          if (!rgt) ctx.fillRect(bx + bw - 1, by, 1, bh);
        }
      }
      
      // Draw gun
      if (isShooting && !isClimbing) {
        const gunX = Math.floor(px + 6 * pixW + offsetX);
        const gunW = Math.ceil(4 * pixW);
        const gunY = Math.floor(py - 4 * pixH + offsetY);
        const gunH = Math.ceil(4 * pixH);
        
        ctx.fillStyle = '#d97706';
        ctx.fillRect(gunX, gunY + Math.ceil(1.5 * pixH), gunW, Math.ceil(2.5 * pixH));
        ctx.fillStyle = '#64748b';
        ctx.fillRect(gunX + Math.ceil(0.5 * pixW), gunY, Math.ceil(3 * pixW), Math.ceil(1.5 * pixH));
        
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(gunX, gunY + Math.ceil(1.5 * pixH), gunW, Math.ceil(2.5 * pixH));
        ctx.strokeRect(gunX + Math.ceil(0.5 * pixW), gunY, Math.ceil(3 * pixW), Math.ceil(1.5 * pixH));
        
        const growingRopes = state.ropes.filter(r => !r.anchored);
        const drawMuzzleFlash = growingRopes.some(r => (r.startY - r.y) < 35);
        if (drawMuzzleFlash) {
          const fx = Math.floor(px + 7.5 * pixW + offsetX);
          const fy = gunY - Math.ceil(2 * pixH);
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(fx - Math.ceil(1.5 * pixW), fy, Math.ceil(3 * pixW), Math.ceil(2 * pixH));
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(fx - Math.ceil(0.5 * pixW), fy + Math.ceil(0.5 * pixH), Math.ceil(pixW), Math.ceil(pixH));
        }
      } else if (!isClimbing) {
        const gunX = Math.floor(px + 3 * pixW + offsetX);
        const gunY = Math.floor(py + 10 * pixH + offsetY);
        const gunW = Math.ceil(10 * pixW);
        const gunH = Math.ceil(1.5 * pixH);
        
        ctx.fillStyle = '#d97706';
        ctx.fillRect(gunX, gunY, gunW, gunH);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(gunX + gunW, gunY, Math.ceil(2 * pixW), gunH);
        
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(gunX, gunY, gunW + Math.ceil(2 * pixW), gunH);
      }
      
      // Orbiting stars for dizzy
      if (isDizzy) {
        const t = Date.now() * 0.005;
        const cx = px + pw / 2;
        const cy = py - 6;
        for (let s = 0; s < 3; s++) {
          const angle = t + (s * Math.PI * 2) / 3;
          const sx = cx + Math.cos(angle) * (pw * 0.6);
          const sy = cy + Math.sin(angle) * 3;
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(Math.floor(sx - pixW), Math.floor(sy - pixH), Math.ceil(pixW * 2), Math.ceil(pixH * 2));
        }
      }
      
      // Shield aura
      if (isShielded) {
        const segments = 12;
        const radiusBase = Math.max(pw, ph) * 0.65;
        ctx.fillStyle = 'rgba(0, 240, 255, 0.6)';
        for (let i = 0; i < segments; i++) {
          const angle = (i / segments) * Math.PI * 2 + (Date.now() * 0.003);
          const jitter = (Math.random() - 0.5) * 4;
          const r = radiusBase + jitter;
          const bx = px + pw / 2 + Math.cos(angle) * r;
          const by = py + ph / 2 + Math.sin(angle) * r;
          ctx.fillRect(Math.floor(bx), Math.floor(by), Math.ceil(pixW * 2), Math.ceil(pixH * 2));
        }
        for (let s = 0; s < 4; s++) {
          const a = Math.random() * Math.PI * 2;
          const d = radiusBase * (0.7 + Math.random() * 0.4);
          const sx = px + pw / 2 + Math.cos(a) * d;
          const sy = py + ph / 2 + Math.sin(a) * d;
          ctx.fillStyle = Math.random() < 0.5 ? '#ffffff' : '#00f0ff';
          ctx.fillRect(Math.floor(sx), Math.floor(sy), Math.ceil(pixW), Math.ceil(pixH));
        }
      }
      
      // Rhea: twin-tail pins sparkle
      if (character === 'rhea' && !isClimbing) {
        ctx.fillStyle = '#eab308';
        const hpX1 = Math.floor(px + 1 * pixW + offsetX);
        const hpY = Math.floor(py + 8 * pixH + offsetY);
        const hpX2 = Math.floor(px + 14 * pixW + offsetX);
        if (Date.now() % 600 < 300) {
          ctx.fillRect(hpX1 - Math.ceil(pixW), hpY, Math.ceil(pixW), Math.ceil(pixH));
          ctx.fillRect(hpX2 + Math.ceil(pixW), hpY, Math.ceil(pixW), Math.ceil(pixH));
        }
      }
      ctx.restore();
    };

    // Draw Canvas
    const drawCanvas = () => {
      ctx.fillStyle = '#070a17';
      ctx.fillRect(0, 0, screenWidth, screenHeight);

      // 1. Scenic Background Image
      const bgIdx = ((state.level - 1) % 3) + 1;
      const bg = state.backgrounds[bgIdx];
      if (bg) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.drawImage(bg, leftWallX, ceilingY, rightWallX - leftWallX, floorY - ceilingY);
        ctx.restore();
      } else {
        // Fallback grid
        ctx.strokeStyle = '#121937';
        ctx.lineWidth = 1;
        for (let x = leftWallX; x <= rightWallX; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, ceilingY);
          ctx.lineTo(x, floorY);
          ctx.stroke();
        }
        for (let y = ceilingY; y <= floorY; y += 40) {
          ctx.beginPath();
          ctx.moveTo(leftWallX, y);
          ctx.lineTo(rightWallX, y);
          ctx.stroke();
        }
      }

      // 2. Truss Structure (Ceiling decoration)
      ctx.save();
      ctx.strokeStyle = '#2b3875';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(leftWallX, ceilingY + 5);
      ctx.lineTo(rightWallX, ceilingY + 5);
      ctx.moveTo(leftWallX, ceilingY + 20);
      ctx.lineTo(rightWallX, ceilingY + 20);
      ctx.stroke();

      ctx.strokeStyle = '#1c2557';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = leftWallX; x < rightWallX; x += 30) {
        ctx.moveTo(x, ceilingY + 5);
        ctx.lineTo(x + 30, ceilingY + 20);
        ctx.moveTo(x + 30, ceilingY + 5);
        ctx.lineTo(x, ceilingY + 20);
      }
      ctx.stroke();
      ctx.restore();

      // Spotlight light beams sways
      const numLights = 5;
      const time = Date.now() * 0.0008;
      for (let i = 0; i < numLights; i++) {
        const lx = leftWallX + ((rightWallX - leftWallX) / (numLights - 1)) * i;
        const ly = ceilingY + 20;
        
        ctx.fillStyle = '#172054';
        ctx.beginPath();
        ctx.rect(lx - 7, ly, 14, 8);
        ctx.fill();
        
        ctx.save();
        const angle = Math.sin(time + i * 1.5) * 0.16;
        ctx.translate(lx, ly + 8);
        ctx.rotate(angle);
        
        const grad = ctx.createLinearGradient(0, 0, 0, 480);
        grad.addColorStop(0, 'rgba(0, 240, 255, 0.25)');
        grad.addColorStop(0.5, 'rgba(139, 92, 246, 0.08)');
        grad.addColorStop(1, 'rgba(255, 0, 127, 0.0)');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-85, 480);
        ctx.lineTo(85, 480);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Draw a retro arcade cabinet double-line border
      ctx.save();
      
      // Outer neon border
      ctx.strokeStyle = '#1d2657';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.rect(leftWallX - 4, ceilingY - 4, (rightWallX - leftWallX) + 8, (floorY - ceilingY) + 8);
      ctx.stroke();
      
      // Inner glowing neon rim
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#3b82f6';
      ctx.beginPath();
      ctx.rect(leftWallX, ceilingY, rightWallX - leftWallX, floorY - ceilingY);
      ctx.stroke();
      
      ctx.restore();

      // 3. Platforms & Ladders
      // Draw Ladders
      ctx.save();
      state.ladders.forEach(lad => {
        // Neon green rails
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#10b981';
        
        ctx.beginPath();
        ctx.moveTo(lad.x - 14, lad.y1);
        ctx.lineTo(lad.x - 14, lad.y2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(lad.x + 14, lad.y1);
        ctx.lineTo(lad.x + 14, lad.y2);
        ctx.stroke();

        // Rungs
        ctx.lineWidth = 2.0;
        for (let ry = lad.y1 + 8; ry <= lad.y2 - 8; ry += 16) {
          ctx.beginPath();
          ctx.moveTo(lad.x - 14, ry);
          ctx.lineTo(lad.x + 14, ry);
          ctx.stroke();
        }
      });
      ctx.restore();

      // Draw Platforms
      ctx.save();
      state.platforms.forEach(plat => {
        ctx.fillStyle = '#111636';
        ctx.strokeStyle = '#3b82f6'; // neon blue rim
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#3b82f6';
        
        ctx.fillRect(plat.x1, plat.y, plat.x2 - plat.x1, plat.h);
        ctx.strokeRect(plat.x1, plat.y, plat.x2 - plat.x1, plat.h);
        
        // Steel structural internal bars
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#1c2557';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        for (let px = plat.x1 + 10; px < plat.x2; px += 15) {
          ctx.moveTo(px, plat.y);
          ctx.lineTo(px, plat.y + plat.h);
        }
        ctx.stroke();
      });
      ctx.restore();

      // 4. Draw Ambient drifting cherry blossom petals
      if (state.blossoms) {
        ctx.fillStyle = 'rgba(255, 182, 193, 0.7)';
        state.blossoms.forEach(b => {
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // 5. Draw Grappling Ropes (Segmented chains + detailed anchor/harpoon tip)
      for (let i = 0; i < state.ropes.length; i++) {
        const r = state.ropes[i];
        if (r.y <= -99) continue; // Skip deleted ropes

        ctx.save();
        ctx.shadowBlur = r.anchored ? 8 : 4;
        ctx.shadowColor = '#00f0ff';
        
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

        // Glowing Harpoon / Double Anchor Tip at the top
        ctx.fillStyle = r.anchored ? '#00f0ff' : '#a855f7';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x - 7, r.y + 11);
        ctx.lineTo(r.x - 3, r.y + 9);
        ctx.lineTo(r.x - 3, r.y + 15);
        ctx.lineTo(r.x + 3, r.y + 15);
        ctx.lineTo(r.x + 3, r.y + 9);
        ctx.lineTo(r.x + 7, r.y + 11);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      }

      // 6. Draw Player Idol (Scaled for Arcade Sizing with Procedural animations)
      const p = state.player;
      const flash = p.invulnTimer > 0 && Math.floor(p.invulnTimer / 4) % 2 === 0;
      
      if (!flash) {
        drawProceduralPlayer(ctx, p, character, state);
      }

      // 7. Draw Falling Power-Ups
      for (let i = 0; i < state.powerups.length; i++) {
        const item = state.powerups[i];
        
        ctx.save();
        ctx.fillStyle = '#121830';
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(item.x, item.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.shadowBlur = 8;
        
        if (item.type === 'double_hook') {
          ctx.shadowColor = '#00f0ff';
          ctx.fillStyle = '#00f0ff';
          ctx.fillRect(item.x - 5, item.y - 6, 3, 12);
          ctx.fillRect(item.x + 2, item.y - 6, 3, 12);
        } else if (item.type === 'sticky_hook') {
          ctx.shadowColor = '#a855f7';
          ctx.strokeStyle = '#a855f7';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(item.x, item.y - 2, 5, 0, Math.PI);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(item.x, item.y - 8);
          ctx.lineTo(item.x, item.y + 3);
          ctx.stroke();
        } else if (item.type === 'shield') {
          ctx.shadowColor = '#adff2f';
          ctx.strokeStyle = '#adff2f';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(item.x, item.y, 6, 0, Math.PI * 2);
          ctx.stroke();
        } else if (item.type === 'hourglass') {
          ctx.shadowColor = '#fbbf24';
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.moveTo(item.x - 5, item.y - 7);
          ctx.lineTo(item.x + 5, item.y - 7);
          ctx.lineTo(item.x - 5, item.y + 7);
          ctx.lineTo(item.x + 5, item.y + 7);
          ctx.closePath();
          ctx.fill();
        } else if (item.type === 'heart') {
          ctx.shadowColor = '#ef4444';
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(item.x - 3, item.y - 3, 3, Math.PI, 0);
          ctx.arc(item.x + 3, item.y - 3, 3, Math.PI, 0);
          ctx.lineTo(item.x, item.y + 5);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // 8. Draw Glassy Bubbles
      for (let i = 0; i < state.bubbles.length; i++) {
        const b = state.bubbles[i];
        const bx = b.x;
        const by = b.y;
        const r = b.radius;

        let marbleClr = '#00f0ff';
        if (b.size === 1) marbleClr = '#ff007f';
        if (b.size === 0) marbleClr = '#adff2f';

        ctx.save();
        
        ctx.fillStyle = 'rgba(230, 245, 255, 0.12)';
        ctx.beginPath();
        ctx.arc(bx, by, r, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(220, 240, 255, 0.7)';
        ctx.lineWidth = 2.0;
        ctx.stroke();

        // Floating cherry blossom petals inside
        ctx.fillStyle = 'rgba(255, 182, 193, 0.85)';
        const petalOffsets = [
          { dx: r * 0.4, dy: r * 0.2 },
          { dx: -r * 0.35, dy: -r * 0.3 },
          { dx: -r * 0.25, dy: r * 0.4 },
          { dx: r * 0.15, dy: -r * 0.5 },
        ];
        petalOffsets.forEach(off => {
          ctx.beginPath();
          ctx.arc(bx + off.dx, by + off.dy, r * 0.08, 0, Math.PI * 2);
          ctx.fill();
        });

        // Central core marble
        ctx.shadowBlur = 8;
        ctx.shadowColor = marbleClr;
        ctx.fillStyle = marbleClr;
        ctx.beginPath();
        ctx.arc(bx, by, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 3D Shading
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.arc(bx, by, r * 0.25, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(bx - r * 0.05, by - r * 0.05, r * 0.14, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(bx - r * 0.08, by - r * 0.08, r * 0.07, 0, Math.PI * 2);
        ctx.fill();

        // Glaze glint
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.beginPath();
        ctx.arc(bx - r * 0.4, by - r * 0.4, r * 0.14, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // 9. Draw Particles
      for (let i = 0; i < state.particles.length; i++) {
        const pt = state.particles[i];
        ctx.save();
        ctx.fillStyle = pt.color;
        ctx.strokeStyle = pt.color;
        ctx.lineWidth = 1.2;

        if (pt.type === 'note') {
          const size = pt.size * 2.2;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, size * 0.35, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(pt.x + size * 0.25, pt.y);
          ctx.lineTo(pt.x + size * 0.25, pt.y - size * 1.2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(pt.x + size * 0.25, pt.y - size * 1.2);
          ctx.lineTo(pt.x + size * 0.7, pt.y - size * 0.9);
          ctx.stroke();
        } else if (pt.type === 'star') {
          const size = pt.size * 1.5;
          ctx.beginPath();
          ctx.moveTo(pt.x - size, pt.y);
          ctx.lineTo(pt.x + size, pt.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y - size);
          ctx.lineTo(pt.x, pt.y + size);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 10. Time Freeze Overlay
      if (state.timeFreezeTimer > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 160, 255, 0.06)';
        ctx.fillRect(leftWallX, ceilingY, rightWallX - leftWallX, floorY - ceilingY);

        if (Math.floor(state.timeFreezeTimer / 8) % 2 === 0) {
          ctx.strokeStyle = '#00a0ff';
          ctx.lineWidth = 4;
          ctx.strokeRect(leftWallX, ceilingY, rightWallX - leftWallX, floorY - ceilingY);
        }

        ctx.strokeStyle = '#00a0ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(400, 300, 32, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(400, 300);
        ctx.lineTo(400, 276);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(400, 300);
        const angle = (state.timeFreezeTimer * 0.05) % (Math.PI * 2);
        ctx.lineTo(400 + Math.sin(angle) * 20, 300 - Math.cos(angle) * 20);
        ctx.stroke();
        ctx.restore();
      }
    };

    // Fixed-timestep loop: physics locked to 60 ticks/sec regardless of monitor refresh rate
    const PHYSICS_DT = 1000 / 60; // ~16.67ms per tick
    let lastTime = performance.now();
    let accumulator = 0;

    const loop = (now) => {
      const elapsed = now - lastTime;
      lastTime = now;
      // Cap elapsed to prevent spiral-of-death on tab switches (max 4 frames worth)
      accumulator += Math.min(elapsed, PHYSICS_DT * 4);

      while (accumulator >= PHYSICS_DT) {
        updatePhysics();
        accumulator -= PHYSICS_DT;
      }

      drawCanvas();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPlaying]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
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
    </div>
  );
}
