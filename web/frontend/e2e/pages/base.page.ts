import { Page, Locator } from '@playwright/test';

/**
 * Base Page Object class with common functionality
 */
export abstract class BasePage {
  readonly page: Page;
  readonly navSidebar: Locator;
  readonly pageTitle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.navSidebar = page.locator('nav, aside, [role="navigation"]');
    this.pageTitle = page.locator('h1, [data-testid="page-title"]').first();
  }

  /**
   * Navigate to a specific path
   */
  async goto(path: string = '/') {
    await this.page.goto(path);
  }

  /**
   * Wait for page to fully load
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get the page title text
   */
  async getPageTitle(): Promise<string> {
    return this.pageTitle.textContent() ?? '';
  }

  /**
   * Click a navigation link
   */
  async navigateTo(linkText: string) {
    await this.page.getByRole('link', { name: linkText }).click();
  }

  /**
   * Check if an element is visible
   */
  async isVisible(selector: string): Promise<boolean> {
    return this.page.locator(selector).isVisible();
  }
}
