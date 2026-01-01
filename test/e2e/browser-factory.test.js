/**
 * E2E Tests for Browser Factory (Phase 2B)
 *
 * Tests real browser operations across all three stealth modes.
 * Set STEALTH_MODE env var to test specific mode.
 */

const assert = require('assert');
const { createBrowser, getStealthMode } = require('../../utils/browser-factory');

describe('Browser Factory E2E Tests', function() {
  this.timeout(60000); // Browser operations can take time

  let browser;
  let page;
  const mode = process.env.STEALTH_MODE || 'rebrowser-playwright';

  before(function() {
    console.log(`\n🧪 Testing stealth mode: ${mode}\n`);
  });

  afterEach(async function() {
    if (page) {
      await page.close();
      page = null;
    }
  });

  after(async function() {
    if (browser) {
      await browser.close();
    }
  });

  describe('Basic Browser Operations', function() {
    it('should create browser and navigate to page', async function() {
      const result = await createBrowser({ headless: true });
      browser = result.browser;

      assert.ok(browser, 'Browser should be created');
      assert.strictEqual(result.mode, mode, `Should use ${mode} mode`);

      page = await browser.newPage();
      assert.ok(page, 'Page should be created');

      await page.goto('about:blank');
      assert.ok(page.url().includes('about:blank'), 'Should navigate to about:blank');
    });

    it('should navigate to real website', async function() {
      if (!browser) {
        const result = await createBrowser({ headless: true });
        browser = result.browser;
      }

      page = await browser.newPage();

      // Navigate to a real site
      await page.goto('https://example.com', { waitUntil: 'domcontentloaded', timeout: 30000 });

      const title = await page.title();
      assert.ok(title.length > 0, 'Page should have a title');

      const url = page.url();
      assert.ok(url.includes('example.com'), 'Should navigate to example.com');
    });

    it('should execute JavaScript on page', async function() {
      if (!browser) {
        const result = await createBrowser({ headless: true });
        browser = result.browser;
      }

      page = await browser.newPage();
      await page.goto('about:blank');

      const result = await page.evaluate(() => {
        return {
          userAgent: navigator.userAgent,
          hasWebdriver: navigator.webdriver,
          platform: navigator.platform
        };
      });

      assert.ok(result.userAgent, 'Should have user agent');
      assert.strictEqual(typeof result.hasWebdriver, 'undefined', 'navigator.webdriver should be undefined (stealth working)');
    });
  });

  describe('Form Interaction', function() {
    it('should fill and submit form', async function() {
      if (!browser) {
        const result = await createBrowser({ headless: true });
        browser = result.browser;
      }

      page = await browser.newPage();

      // Create a test form
      await page.goto('about:blank');
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <body>
            <form id="testForm">
              <input type="text" id="name" name="name" />
              <input type="email" id="email" name="email" />
              <button type="submit">Submit</button>
            </form>
            <div id="result"></div>
            <script>
              document.getElementById('testForm').addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('name').value;
                const email = document.getElementById('email').value;
                document.getElementById('result').textContent = name + '|' + email;
              });
            </script>
          </body>
        </html>
      `);

      // Fill form
      await page.type('#name', 'Test User');
      await page.type('#email', 'test@example.com');

      // Submit
      await page.click('button[type="submit"]');

      // Wait for result
      await page.waitForFunction(
        () => document.getElementById('result').textContent !== '',
        { timeout: 5000 }
      );

      const result = await page.evaluate(() => document.getElementById('result').textContent);
      assert.strictEqual(result, 'Test User|test@example.com', 'Form should submit correctly');
    });
  });

  describe('CAPTCHA Detection Simulation', function() {
    it('should detect simulated reCAPTCHA v2', async function() {
      if (!browser) {
        const result = await createBrowser({ headless: true });
        browser = result.browser;
      }

      page = await browser.newPage();

      // Create page with reCAPTCHA elements
      await page.goto('about:blank');
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <body>
            <div class="g-recaptcha" data-sitekey="test-site-key-123"></div>
          </body>
        </html>
      `);

      // Detect CAPTCHA using same logic as captcha-solver
      const captcha = await page.evaluate(() => {
        const element = document.querySelector('.g-recaptcha');
        if (element) {
          const sitekey = element.getAttribute('data-sitekey');
          return { type: 'recaptcha_v2', sitekey, detected: true };
        }
        return null;
      });

      assert.ok(captcha, 'Should detect CAPTCHA');
      assert.strictEqual(captcha.type, 'recaptcha_v2');
      assert.strictEqual(captcha.sitekey, 'test-site-key-123');
    });
  });

  describe('Multiple Pages', function() {
    it('should handle multiple pages simultaneously', async function() {
      if (!browser) {
        const result = await createBrowser({ headless: true });
        browser = result.browser;
      }

      // Create 3 pages
      const page1 = await browser.newPage();
      const page2 = await browser.newPage();
      const page3 = await browser.newPage();

      // Navigate them to different content
      await page1.goto('about:blank');
      await page1.setContent('<html><body><h1>Page 1</h1></body></html>');

      await page2.goto('about:blank');
      await page2.setContent('<html><body><h1>Page 2</h1></body></html>');

      await page3.goto('about:blank');
      await page3.setContent('<html><body><h1>Page 3</h1></body></html>');

      // Check each page has correct content
      const text1 = await page1.evaluate(() => document.querySelector('h1').textContent);
      const text2 = await page2.evaluate(() => document.querySelector('h1').textContent);
      const text3 = await page3.evaluate(() => document.querySelector('h1').textContent);

      assert.strictEqual(text1, 'Page 1');
      assert.strictEqual(text2, 'Page 2');
      assert.strictEqual(text3, 'Page 3');

      // Cleanup
      await page1.close();
      await page2.close();
      await page3.close();
    });
  });

  describe('Screenshot Capture', function() {
    it('should capture screenshot', async function() {
      if (!browser) {
        const result = await createBrowser({ headless: true });
        browser = result.browser;
      }

      page = await browser.newPage();
      await page.goto('about:blank');
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <body>
            <h1>Test Screenshot</h1>
            <p>This is a test page for screenshot capture.</p>
          </body>
        </html>
      `);

      // Capture screenshot
      const screenshot = await page.screenshot();

      assert.ok(screenshot, 'Screenshot should be captured');
      assert.ok(screenshot.length > 0, 'Screenshot should have data');
      assert.ok(Buffer.isBuffer(screenshot), 'Screenshot should be a buffer');
    });
  });

  describe('Stealth Detection Tests', function() {
    it('should not expose automation signals', async function() {
      if (!browser) {
        const result = await createBrowser({ headless: true });
        browser = result.browser;
      }

      page = await browser.newPage();
      await page.goto('about:blank');

      const signals = await page.evaluate(() => {
        return {
          webdriver: navigator.webdriver,
          hasChrome: !!window.chrome,
          hasPermissions: !!navigator.permissions,
          hasPlugins: navigator.plugins.length > 0,
          languages: navigator.languages,
          platform: navigator.platform
        };
      });

      // Key stealth checks
      assert.strictEqual(typeof signals.webdriver, 'undefined',
        'navigator.webdriver should be undefined');

      // These should exist in a "real" browser
      assert.ok(signals.hasPermissions, 'navigator.permissions should exist');
      assert.ok(signals.languages && signals.languages.length > 0, 'Should have languages');
      assert.ok(signals.platform, 'Should have platform');
    });
  });
});
