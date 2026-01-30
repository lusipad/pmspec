import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Dashboard Page Object
 */
export class DashboardPage extends BasePage {
  readonly statsCards: Locator;
  readonly chartContainer: Locator;
  readonly recentActivities: Locator;

  constructor(page: Page) {
    super(page);
    this.statsCards = page.locator('[data-testid="stats-card"], .stats-card, .card');
    this.chartContainer = page.locator('[data-testid="chart"], .recharts-wrapper, canvas');
    this.recentActivities = page.locator('[data-testid="recent-activities"], .activities');
  }

  /**
   * Navigate to dashboard
   */
  async goto() {
    await super.goto('/');
  }

  /**
   * Get the number of stats cards
   */
  async getStatsCardsCount(): Promise<number> {
    return this.statsCards.count();
  }

  /**
   * Check if charts are rendered
   */
  async hasCharts(): Promise<boolean> {
    return this.chartContainer.count().then(count => count > 0);
  }

  /**
   * Verify dashboard loaded successfully
   */
  async verifyLoaded() {
    await expect(this.page).toHaveURL('/');
    await this.waitForPageLoad();
  }
}
