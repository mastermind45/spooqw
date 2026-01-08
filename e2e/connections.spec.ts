import { test, expect } from '@playwright/test';

test.describe('Connections', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/connections');
  });

  test('should display connections page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Connections');
    
    // Should have search input
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    
    // Should have create button
    await expect(page.locator('text=New Connection')).toBeVisible();
  });

  test('should open create connection dialog', async ({ page }) => {
    await page.click('text=New Connection');
    
    // Dialog should appear
    await expect(page.locator('text=Create Connection')).toBeVisible();
    await expect(page.locator('text=Connection Name')).toBeVisible();
    await expect(page.locator('text=Connection Type')).toBeVisible();
  });

  test('should show connection types', async ({ page }) => {
    await page.click('text=New Connection');
    
    // Should show various connection types
    await expect(page.locator('text=JDBC Database')).toBeVisible();
    await expect(page.locator('text=Apache Kafka')).toBeVisible();
    await expect(page.locator('text=Amazon S3')).toBeVisible();
  });

  test('should close create dialog on cancel', async ({ page }) => {
    await page.click('text=New Connection');
    
    // Click cancel
    await page.click('button:has-text("Cancel")');
    
    // Dialog should close
    await expect(page.locator('role=dialog')).not.toBeVisible();
  });

  test('should search connections', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    await searchInput.fill('kafka');
    
    // Wait for filtering
    await page.waitForTimeout(300);
  });
});
