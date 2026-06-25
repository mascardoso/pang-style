/**
 * Retrieves a JSON-serializable snapshot of the React Canvas game state.
 * This runs inside the browser page context.
 */
export async function getGameStateSnapshot(page) {
  return await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return null;
    
    // Find the React Fiber key attached to the canvas DOM element
    const fiberKey = Object.keys(canvas).find(key => key.startsWith('__reactFiber$'));
    if (!fiberKey) return null;
    
    let fiber = canvas[fiberKey];
    
    // Traverse up the React Fiber tree
    while (fiber) {
      let hook = fiber.memoizedState;
      
      // Traverse the hooks linked list
      while (hook && typeof hook === 'object') {
        if (hook.memoizedState && hook.memoizedState.current) {
          const state = hook.memoizedState.current;
          
          // Verify we found the correct gameStateRef hook structure
          if (state.player && Array.isArray(state.bubbles) && Array.isArray(state.ropes)) {
            // CRITICAL: We must serialize and return only plain, JSON-compatible fields.
            // HTMLImageElement instances in 'sprites' and 'backgrounds' cannot be serialized and would fail.
            return {
              player: {
                x: state.player.x,
                y: state.player.y,
                width: state.player.width,
                height: state.player.height,
                speed: state.player.speed,
                weapon: state.player.weapon,
                shieldActive: state.player.shieldActive,
                isClimbing: state.player.isClimbing,
                onGround: state.player.onGround,
                vy: state.player.vy,
                walkTimer: state.player.walkTimer,
                invulnTimer: state.player.invulnTimer,
              },
              ropes: state.ropes.map(r => ({
                x: r.x,
                y: r.y,
                anchored: r.anchored,
                anchorTimer: r.anchorTimer,
                startY: r.startY
              })),
              bubbles: state.bubbles.map(b => ({
                x: b.x,
                y: b.y,
                vx: b.vx,
                vy: b.vy,
                size: b.size,
                radius: b.radius
              })),
              platforms: state.platforms,
              ladders: state.ladders,
              lives: state.lives,
              score: state.score,
              level: state.level,
            };
          }
        }
        hook = hook.next;
      }
      fiber = fiber.return;
    }
    return null;
  });
}
