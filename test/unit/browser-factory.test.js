/**
 * Unit Tests for Browser Factory
 *
 * Tests multi-stealth architecture (puppeteer, rebrowser-playwright, patchright)
 */

const assert = require('assert');
const { createBrowser, getStealthMode, validateStealthConfig } = require('../../utils/browser-factory');

describe('Browser Factory Unit Tests', function() {
  this.timeout(30000); // Browser launch can take time

  describe('Configuration Validation', function() {
    it('should validate stealth config correctly', function() {
      const originalMode = process.env.STEALTH_MODE;

      // Test valid modes
      process.env.STEALTH_MODE = 'puppeteer';
      assert.strictEqual(validateStealthConfig().valid, true);

      process.env.STEALTH_MODE = 'rebrowser-playwright';
      assert.strictEqual(validateStealthConfig().valid, true);

      process.env.STEALTH_MODE = 'patchright';
      assert.strictEqual(validateStealthConfig().valid, true);

      // Test invalid mode
      process.env.STEALTH_MODE = 'invalid-mode';
      const result = validateStealthConfig();
      assert.strictEqual(result.valid, false);
      assert.ok(result.message.includes('Invalid STEALTH_MODE'));

      // Restore
      process.env.STEALTH_MODE = originalMode;
    });

    it('should get current stealth mode', function() {
      const originalMode = process.env.STEALTH_MODE;

      process.env.STEALTH_MODE = 'rebrowser-playwright';
      assert.strictEqual(getStealthMode(), 'rebrowser-playwright');

      process.env.STEALTH_MODE = 'patchright';
      assert.strictEqual(getStealthMode(), 'patchright');

      // Restore
      process.env.STEALTH_MODE = originalMode;
    });
  });

  describe('Browser Creation - rebrowser-playwright', function() {
    let browser;

    before(function() {
      process.env.STEALTH_MODE = 'rebrowser-playwright';
    });

    it('should create rebrowser-playwright browser', async function() {
      const result = await createBrowser({ headless: true });
      browser = result.browser;

      assert.ok(browser, 'Browser should be created');
      assert.strictEqual(result.mode, 'rebrowser-playwright');
    });

    it('should create page and navigate', async function() {
      const page = await browser.newPage();
      assert.ok(page, 'Page should be created');

      await page.goto('about:blank');
      assert.ok(page.url().includes('about:blank'));

      await page.close();
    });

    after(async function() {
      if (browser) {
        await browser.close();
      }
    });
  });

  describe('Browser Creation - patchright', function() {
    let browser;

    before(function() {
      process.env.STEALTH_MODE = 'patchright';
    });

    it('should create patchright browser with persistent context', async function() {
      const result = await createBrowser({ headless: true });
      browser = result.browser;

      assert.ok(browser, 'Browser should be created');
      assert.strictEqual(result.mode, 'patchright');
    });

    it('should create page and navigate (patchright)', async function() {
      const page = await browser.newPage();
      assert.ok(page, 'Page should be created');

      await page.goto('about:blank');
      assert.ok(page.url().includes('about:blank'));

      await page.close();
    });

    after(async function() {
      if (browser) {
        await browser.close();
      }
    });
  });
});
