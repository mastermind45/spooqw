import { test, expect } from '@playwright/test';

test.describe('Runs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/runs');
  });

  test('should display runs list', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Runs');
    
    // Should have filter buttons
    await expect(page.locator('button:has-text("All")')).toBeVisible();
    await expect(page.locator('button:has-text("Running")')).toBeVisible();
    await expect(page.locator('button:has-text("Failed")')).toBeVisible();
  });

  test('should filter by status', async ({ page }) => {
    // Click running filter
    await page.click('button:has-text("Running")');
    
    // Wait for filter to apply
    await page.waitForTimeout(300);
  });

  test('should show run count', async ({ page }) => {
    // Should show count badge
    await expect(page.locator('text=/\\d+ runs/')).toBeVisible();
  });
});

test.describe('Run Detail', () => {
  test('should display run tabs', async ({ page }) => {
    await page.goto('/runs/1');
    
    // Check for tabs
    await expect(page.locator('button:has-text("Logs")')).toBeVisible();
    await expect(page.locator('button:has-text("DAG")')).toBeVisible();
    await expect(page.locator('button:has-text("Steps")')).toBeVisible();
  });

  test('should show progress bar', async ({ page }) => {
    await page.goto('/runs/1');
    
    // Should have progress section
    await expect(page.locator('text=Progress')).toBeVisible();
  });

  test('should switch to logs tab', async ({ page }) => {
    await page.goto('/runs/1');
    
    await page.click('button:has-text("Logs")');
    
    await expect(page.locator('text=Execution Logs')).toBeVisible();
  });

  test('should switch to steps tab', async ({ page }) => {
    await page.goto('/runs/1');
    
    await page.click('button:has-text("Steps")');
    
    await expect(page.locator('text=Step Details')).toBeVisible();
  });
});
