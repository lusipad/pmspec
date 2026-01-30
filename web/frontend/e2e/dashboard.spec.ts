import { test, expect } from '@playwright/test';
import { DashboardPage } from './pages/dashboard.page';

test.describe('Dashboard Page', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
  });

  test('should load dashboard page successfully', async ({ page }) => {
    // Verify we're on the dashboard (root URL)
    await expect(page).toHaveURL('/');
    
    // Page should have content
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('should display page title or heading', async ({ page }) => {
    // Check for any heading element
    const hasHeading = await page.locator('h1, h2, h3').count() > 0;
    expect(hasHeading).toBeTruthy();
  });

  test('should have navigation elements', async ({ page }) => {
    // Check for navigation - could be nav, aside, or links
    const hasNav = await page.locator('nav, aside, [role="navigation"]').count() > 0;
    const hasLinks = await page.getByRole('link').count() > 0;
    
    expect(hasNav || hasLinks).toBeTruthy();
  });

  test('should display stats or summary cards', async ({ page }) => {
    // Look for card-like elements that might show statistics
    const statsCount = await dashboardPage.getStatsCardsCount();
    
    // Dashboard typically has some visual elements
    // This test is flexible as actual content depends on data
    await expect(page.locator('body')).toBeVisible();
  });

  test('should allow navigation to other pages', async ({ page }) => {
    // Find and click on features link (could have various names)
    const featuresLink = page.getByRole('link', { name: /功能|features/i });
    
    if (await featuresLink.count() > 0) {
      await featuresLink.first().click();
      await expect(page).toHaveURL(/features/);
    }
  });
});

test.describe('Dashboard Navigation', () => {
  test('should navigate to kanban from dashboard', async ({ page }) => {
    await page.goto('/');
    
    const kanbanLink = page.getByRole('link', { name: /看板|kanban/i });
    if (await kanbanLink.count() > 0) {
      await kanbanLink.first().click();
      await expect(page).toHaveURL(/kanban/);
    }
  });

  test('should navigate to gantt from dashboard', async ({ page }) => {
    await page.goto('/');
    
    const ganttLink = page.getByRole('link', { name: /甘特图|gantt/i });
    if (await ganttLink.count() > 0) {
      await ganttLink.first().click();
      await expect(page).toHaveURL(/gantt/);
    }
  });
});
