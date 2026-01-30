import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Kanban Page Object
 */
export class KanbanPage extends BasePage {
  readonly kanbanBoard: Locator;
  readonly columns: Locator;
  readonly todoColumn: Locator;
  readonly doingColumn: Locator;
  readonly doneColumn: Locator;
  readonly cards: Locator;

  constructor(page: Page) {
    super(page);
    this.kanbanBoard = page.locator('[data-testid="kanban-board"], .kanban-board, [role="region"]');
    this.columns = page.locator('[data-testid="kanban-column"], .kanban-column');
    this.todoColumn = page.locator('[data-testid="column-todo"], [data-status="todo"]');
    this.doingColumn = page.locator('[data-testid="column-doing"], [data-status="doing"]');
    this.doneColumn = page.locator('[data-testid="column-done"], [data-status="done"]');
    this.cards = page.locator('[data-testid="kanban-card"], .kanban-card');
  }

  /**
   * Navigate to kanban page
   */
  async goto() {
    await super.goto('/kanban');
  }

  /**
   * Get the number of columns
   */
  async getColumnsCount(): Promise<number> {
    return this.columns.count();
  }

  /**
   * Get the number of cards in a specific column
   */
  async getCardsInColumn(status: 'todo' | 'doing' | 'done'): Promise<number> {
    const columnMap = {
      todo: this.todoColumn,
      doing: this.doingColumn,
      done: this.doneColumn,
    };
    return columnMap[status].locator('[data-testid="kanban-card"], .kanban-card').count();
  }

  /**
   * Get total card count
   */
  async getTotalCardsCount(): Promise<number> {
    return this.cards.count();
  }

  /**
   * Verify kanban page loaded
   */
  async verifyLoaded() {
    await expect(this.page).toHaveURL('/kanban');
    await this.waitForPageLoad();
  }

  /**
   * Check if kanban board is visible
   */
  async hasKanbanBoard(): Promise<boolean> {
    // Check for any element that looks like a kanban board
    const hasBoard = await this.kanbanBoard.count() > 0;
    if (hasBoard) return true;
    
    // Fallback: check for multiple columns or cards layout
    const hasColumns = await this.columns.count() > 0;
    return hasColumns;
  }
}
