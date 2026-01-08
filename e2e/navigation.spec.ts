import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate to dashboard', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('h1')).toContainText('Dashboard');
    await expect(page).toHaveURL('/');
  });

  test('should navigate to pipelines', async ({ page }) => {
    await page.goto('/');
    
    // Click on Pipelines in sidebar
    await page.click('text=Pipelines');
    
    await expect(page).toHaveURL('/pipelines');
    await expect(page.locator('h1')).toContainText('Pipelines');
  });

  test('should navigate to runs', async ({ page }) => {
    await page.goto('/');
    
    await page.click('text=Runs');
    
    await expect(page).toHaveURL('/runs');
    await expect(page.locator('h1')).toContainText('Runs');
  });

  test('should navigate to connections', async ({ page }) => {
    await page.goto('/');
    
    await page.click('text=Connections');
    
    await expect(page).toHaveURL('/connections');
    await expect(page.locator('h1')).toContainText('Connections');
  });

  test('should navigate to settings', async ({ page }) => {
    await page.goto('/');
    
    await page.click('text=Settings');
    
    await expect(page).toHaveURL('/settings');
    await expect(page.locator('h1')).toContainText('Settings');
  });
});

test.describe('Dashboard', () => {
  test('should display stats cards', async ({ page }) => {
    await page.goto('/');
    
    // Check for stat cards
    await expect(page.locator('text=Total Pipelines')).toBeVisible();
    await expect(page.locator('text=Total Runs')).toBeVisible();
  });

  test('should display recent runs section', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('text=Recent Runs')).toBeVisible();
  });
});
