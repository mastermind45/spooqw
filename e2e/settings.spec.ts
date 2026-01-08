import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('should display settings page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Settings');
  });

  test('should have theme section', async ({ page }) => {
    await expect(page.locator('text=Theme')).toBeVisible();
    await expect(page.locator('text=Light')).toBeVisible();
    await expect(page.locator('text=Dark')).toBeVisible();
    await expect(page.locator('text=System')).toBeVisible();
  });

  test('should have appearance section', async ({ page }) => {
    await expect(page.locator('text=Appearance')).toBeVisible();
  });

  test('should switch theme', async ({ page }) => {
    // Click dark theme
    await page.click('button:has-text("Dark")');
    
    // Wait for theme change
    await page.waitForTimeout(300);
    
    // HTML should have dark class
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);
    
    // Click light theme
    await page.click('button:has-text("Light")');
    
    await page.waitForTimeout(300);
    
    // Should not have dark class
    await expect(html).not.toHaveClass(/dark/);
  });
});
