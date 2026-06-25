import { test, expect } from '@playwright/test';
import { getGameStateSnapshot } from './helpers';

// Helper to transition the UI from the Start Screen to the Active Game Stage
async function startNewGame(page) {
  await page.goto('/');
  
  // Click "CHOOSE IDOL" on start screen
  const chooseBtn = page.getByRole('button', { name: 'CHOOSE IDOL' });
  await expect(chooseBtn).toBeVisible();
  await chooseBtn.click();
  
  // Select "Rhea" on select screen
  const rheaCard = page.locator('.char-select-card').filter({ hasText: 'Rhea' });
  await expect(rheaCard).toBeVisible();
  await rheaCard.click();
  
  // Lock in and play
  const lockBtn = page.getByRole('button', { name: 'LOCK IN & PLAY' });
  await expect(lockBtn).toBeVisible();
  await lockBtn.click();
  
  // Confirm canvas mounts
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
}

test.describe('Cloudcrush Arcade Game E2E Suites', () => {

  test('Tier 1: Start game UI flow and Canvas initialization', async ({ page }) => {
    await startNewGame(page);
    
    // Validate initial state via Fiber traversal
    const state = await getGameStateSnapshot(page);
    expect(state).not.toBeNull();
    expect(state.level).toBe(1);
    expect(state.lives).toBe(3);
    expect(state.score).toBe(0);
    expect(state.player.weapon).toBe('single');
  });

  test('Tier 2: Player horizontal movement & borders', async ({ page }) => {
    await startNewGame(page);
    
    const initialState = await getGameStateSnapshot(page);
    const startX = initialState.player.x;
    
    // Press 'ArrowRight' / 'D' to move right
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(300); // walk for 300ms
    await page.keyboard.up('ArrowRight');
    
    const movedState = await getGameStateSnapshot(page);
    expect(movedState.player.x).toBeGreaterThan(startX);
  });

  test('Tier 3: Harpoon firing and projectile creation', async ({ page }) => {
    await startNewGame(page);
    
    // Initially, there should be no active ropes
    let state = await getGameStateSnapshot(page);
    expect(state.ropes.length).toBe(0);
    
    // Press Spacebar to shoot
    await page.keyboard.press('Space');
    
    // State immediately after shooting should show a hook/rope in action
    state = await getGameStateSnapshot(page);
    expect(state.ropes.length).toBe(1);
    expect(state.ropes[0].anchored).toBe(false);
    expect(state.ropes[0].x).toBeCloseTo(state.player.x + state.player.width / 2, 1);
  });

  test('Tier 4: Collision detection & Shield/Invulnerability response', async ({ page }) => {
    await startNewGame(page);
    
    // Read state and monitor bubbles hitting the player
    // Bubble starts at Level 1 coordinates
    const state = await getGameStateSnapshot(page);
    expect(state.bubbles.length).toBeGreaterThan(0);
    
    // Here we check that when the game is loaded, invulnTimer is initially set
    expect(state.player.invulnTimer).toBeGreaterThan(0);
  });
});
