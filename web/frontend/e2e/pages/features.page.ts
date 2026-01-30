import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Features Page Object
 */
export class FeaturesPage extends BasePage {
  readonly featureTable: Locator;
  readonly featureRows: Locator;
  readonly addFeatureButton: Locator;
  readonly searchInput: Locator;
  readonly filterDropdown: Locator;

  constructor(page: Page) {
    super(page);
    this.featureTable = page.locator('table, [data-testid="feature-table"]');
    this.featureRows = page.locator('tbody tr, [data-testid="feature-row"]');
    this.addFeatureButton = page.getByRole('button', { name: /添加|新增|add/i });
    this.searchInput = page.getByPlaceholder(/搜索|search/i);
    this.filterDropdown = page.locator('[data-testid="filter"], select');
  }

  /**
   * Navigate to features page
   */
  async goto() {
    await super.goto('/features');
  }

  /**
   * Get the count of feature rows
   */
  async getFeatureCount(): Promise<number> {
    return this.featureRows.count();
  }

  /**
   * Search for features
   */
  async search(query: string) {
    await this.searchInput.fill(query);
  }

  /**
   * Click on a feature row by name
   */
  async clickFeature(featureName: string) {
    await this.page.getByRole('row').filter({ hasText: featureName }).click();
  }

  /**
   * Verify features page loaded
   */
  async verifyLoaded() {
    await expect(this.page).toHaveURL('/features');
    await this.waitForPageLoad();
  }

  /**
   * Check if feature table is visible
   */
  async hasFeatureTable(): Promise<boolean> {
    return this.featureTable.isVisible();
  }
}
