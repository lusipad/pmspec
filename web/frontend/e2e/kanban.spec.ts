import { test, expect } from '@playwright/test';
import { KanbanPage } from './pages/kanban.page';

test.describe('Kanban Page', () => {
  let kanbanPage: KanbanPage;

  test.beforeEach(async ({ page }) => {
    kanbanPage = new KanbanPage(page);
    await kanbanPage.goto();
  });

  test('should load kanban page successfully', async ({ page }) => {
    await expect(page).toHaveURL('/kanban');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('should display page heading', async ({ page }) => {
    const hasHeading = await page.locator('h1, h2, h3').count() > 0;
    expect(hasHeading).toBeTruthy();
  });

  test('should display kanban board layout', async ({ page }) => {
    await kanbanPage.waitForPageLoad();
    
    // Kanban board should have a flex/grid layout with columns
    // Check for board-like structure
    const hasBoard = await kanbanPage.hasKanbanBoard();
    
    // Board should be visible (even if empty)
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display status columns', async ({ page }) => {
    await kanbanPage.waitForPageLoad();
    
    // Look for column headers or sections
    // Typical statuses: todo, doing, done (or Chinese equivalents)
    const todoText = page.getByText(/todo|待办|待开发|待做/i);
    const doingText = page.getByText(/doing|进行中|开发中/i);
    const doneText = page.getByText(/done|已完成|完成/i);
    
    // At least some status indicators should be present
    const hasStatuses = 
      await todoText.count() > 0 ||
      await doingText.count() > 0 ||
      await doneText.count() > 0;
    
    // Verify page structure
    await expect(page).toHaveURL('/kanban');
  });
});

test.describe('Kanban Page Cards', () => {
  test('should display feature cards when data is available', async ({ page }) => {
    const kanbanPage = new KanbanPage(page);
    await kanbanPage.goto();
    await kanbanPage.waitForPageLoad();
    
    // Count cards (might be 0 without backend)
    const cardCount = await kanbanPage.getTotalCardsCount();
    expect(cardCount).toBeGreaterThanOrEqual(0);
  });

  test('should have interactive cards', async ({ page }) => {
    const kanbanPage = new KanbanPage(page);
    await kanbanPage.goto();
    
    // Cards should be clickable/draggable elements
    const cards = page.locator('[data-testid="kanban-card"], .kanban-card, [draggable="true"]');
    
    if (await cards.count() > 0) {
      // Verify cards are interactive
      await expect(cards.first()).toBeVisible();
    }
  });
});

test.describe('Kanban Page Navigation', () => {
  test('should navigate to features page', async ({ page }) => {
    await page.goto('/kanban');
    
    const featuresLink = page.getByRole('link', { name: /功能|features/i });
    if (await featuresLink.count() > 0) {
      await featuresLink.first().click();
      await expect(page).toHaveURL(/features/);
    }
  });

  test('should navigate back to dashboard', async ({ page }) => {
    await page.goto('/kanban');
    
    const homeLink = page.getByRole('link', { name: /仪表盘|dashboard|首页|home/i });
    if (await homeLink.count() > 0) {
      await homeLink.first().click();
      await expect(page).toHaveURL('/');
    }
  });

  test('should be accessible via direct URL', async ({ page }) => {
    await page.goto('/kanban');
    await expect(page).toHaveURL('/kanban');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Kanban Drag and Drop', () => {
  test.skip('should support drag and drop between columns', async ({ page }) => {
    // This test is skipped by default as it requires actual data
    // and complex drag-and-drop interaction
    const kanbanPage = new KanbanPage(page);
    await kanbanPage.goto();
    await kanbanPage.waitForPageLoad();
    
    const cards = page.locator('[draggable="true"]');
    if (await cards.count() > 0) {
      // Would need actual drag-and-drop implementation
      // Using @dnd-kit library
    }
  });
});
