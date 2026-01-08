import { test, expect } from '@playwright/test';

test.describe('Pipelines', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pipelines');
  });

  test('should display pipelines list', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Pipelines');
    
    // Should have search input
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    
    // Should have create button
    await expect(page.locator('text=New Pipeline')).toBeVisible();
  });

  test('should navigate to create pipeline', async ({ page }) => {
    await page.click('text=New Pipeline');
    
    await expect(page).toHaveURL('/pipelines/new');
    await expect(page.locator('h1')).toContainText('Create Pipeline');
  });

  test('should filter pipelines by search', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    await searchInput.fill('test');
    
    // Wait for filtering to apply
    await page.waitForTimeout(300);
  });
});

test.describe('Pipeline Editor', () => {
  test('should display editor tabs', async ({ page }) => {
    await page.goto('/pipelines/new');
    
    // Check for tabs
    await expect(page.locator('text=Configuration')).toBeVisible();
    await expect(page.locator('text=Visual Editor')).toBeVisible();
    await expect(page.locator('text=Preview DAG')).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    await page.goto('/pipelines/new');
    
    // Click Visual Editor tab
    await page.click('button:has-text("Visual Editor")');
    
    // Should show DAG editor
    await expect(page.locator('text=Drag and drop')).toBeVisible();
    
    // Click Preview tab
    await page.click('button:has-text("Preview DAG")');
    
    // Should show preview
    await expect(page.locator('text=Pipeline Preview')).toBeVisible();
  });

  test('should validate pipeline name is required', async ({ page }) => {
    await page.goto('/pipelines/new');
    
    // Try to save without name
    await page.click('button:has-text("Save")');
    
    // Should show error toast
    await expect(page.locator('text=Pipeline name is required')).toBeVisible();
  });

  test('should have YAML editor with default config', async ({ page }) => {
    await page.goto('/pipelines/new');
    
    // Monaco editor should be present
    await expect(page.locator('.monaco-editor')).toBeVisible();
  });
});

test.describe('Pipeline Detail', () => {
  test('should navigate back to list', async ({ page }) => {
    await page.goto('/pipelines/1');
    
    // Click back button
    await page.click('a[href="/pipelines"]');
    
    await expect(page).toHaveURL('/pipelines');
  });
});
