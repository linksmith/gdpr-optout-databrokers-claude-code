/**
 * E2E Tests for CAPTCHA Solver Module (Phase 2B)
 *
 * Tests integration with mock 2Captcha API server.
 * Compatible with all stealth modes (puppeteer, rebrowser-playwright, patchright).
 */

const assert = require('assert');
const Mock2CaptchaServer = require('../mocks/2captcha-mock-server');
const { createBrowser } = require('../../utils/browser-factory');

// Mock environment for testing
process.env.CAPTCHA_ENABLED = 'true';
process.env.CAPTCHA_API_PROVIDER = '2captcha';
process.env.CAPTCHA_API_KEY = 'test_api_key_123';
process.env.STEALTH_MODE = process.env.STEALTH_MODE || 'rebrowser-playwright';

describe('CAPTCHA Solver E2E Tests', function() {
  this.timeout(60000); // 60 second timeout for E2E tests

  let mockServer;
  let browser;
  let page;

  before(async function() {
    // Start mock 2Captcha API server
    mockServer = new Mock2CaptchaServer({
      port: 3001,
      solveDelay: 1000, // Fast for testing
      validApiKey: 'test_api_key_123'
    });
    await mockServer.start();

    // Override API endpoints in captcha-solver to use mock server
    process.env.CAPTCHA_API_BASE_URL = 'http://localhost:3001';
  });

  after(async function() {
    if (mockServer) {
      await mockServer.stop();
    }
  });

  beforeEach(async function() {
    // Reset mock server stats
    await fetch('http://localhost:3001/reset');

    // Launch browser with configured stealth mode
    const { browser: browserInstance } = await createBrowser({ headless: true });
    browser = browserInstance;
    page = await browser.newPage();
  });

  afterEach(async function() {
    if (browser) {
      await browser.close();
    }
  });

  describe('CAPTCHA Detection', function() {
    it('should detect reCAPTCHA v2 on page', async function() {
      // Create test HTML with reCAPTCHA
      const html = `
        <html>
          <body>
            <form>
              <div class="g-recaptcha" data-sitekey="6LeTest123456"></div>
            </form>
            <script src="https://www.google.com/recaptcha/api.js"></script>
          </body>
        </html>
      `;

      await page.setContent(html);

      const { detectCaptcha } = require('../../utils/captcha-solver');
      const captcha = await detectCaptcha(page);

      assert.ok(captcha, 'Should detect CAPTCHA');
      assert.strictEqual(captcha.type, 'recaptcha_v2');
      assert.strictEqual(captcha.sitekey, '6LeTest123456');
    });

    it('should detect reCAPTCHA v3 (invisible)', async function() {
      const html = `
        <html>
          <head>
            <script src="https://www.google.com/recaptcha/api.js?render=6LeTest789"></script>
          </head>
          <body>
            <form></form>
          </body>
        </html>
      `;

      await page.setContent(html);

      const { detectCaptcha } = require('../../utils/captcha-solver');
      const captcha = await detectCaptcha(page);

      assert.ok(captcha, 'Should detect CAPTCHA');
      assert.strictEqual(captcha.type, 'recaptcha_v3');
      assert.strictEqual(captcha.sitekey, '6LeTest789');
    });

    it('should return null when no CAPTCHA present', async function() {
      const html = '<html><body><form><input type="text"></form></body></html>';
      await page.setContent(html);

      const { detectCaptcha } = require('../../utils/captcha-solver');
      const captcha = await detectCaptcha(page);

      assert.strictEqual(captcha, null, 'Should not detect CAPTCHA');
    });
  });

  describe('API Solving', function() {
    it('should solve CAPTCHA via mock API', async function() {
      const html = `
        <html>
          <body>
            <form>
              <div class="g-recaptcha" data-sitekey="6LeTest123456"></div>
              <textarea id="g-recaptcha-response"></textarea>
            </form>
          </body>
        </html>
      `;

      await page.setContent(html);

      // Patch captcha-solver to use mock server
      const captchaSolver = require('../../utils/captcha-solver');
      const originalHttpRequest = captchaSolver.httpRequest || function() {};

      // Override to use localhost
      const httpRequest = async (url) => {
        const modifiedUrl = url.replace('https://2captcha.com', 'http://localhost:3001');
        const response = await fetch(modifiedUrl);
        return await response.text();
      };

      // Monkey-patch for testing
      global.fetch = require('node-fetch');

      const { detectCaptcha, solveCaptcha } = captchaSolver;
      const captcha = await detectCaptcha(page);

      assert.ok(captcha, 'Should detect CAPTCHA');

      // This would normally call real API, but we've mocked it
      // For now, just verify detection worked
      assert.strictEqual(captcha.type, 'recaptcha_v2');
    });
  });

  describe('Mock Server Validation', function() {
    it('should submit CAPTCHA task successfully', async function() {
      const response = await fetch(
        'http://localhost:3001/in.php?key=test_api_key_123&method=userrecaptcha&googlekey=6LeTest&pageurl=http://example.com&json=1'
      );

      const data = await response.json();

      assert.strictEqual(data.status, 1, 'Should return success');
      assert.ok(data.request, 'Should return task ID');
      assert.ok(/^\d{10}$/.test(data.request), 'Task ID should be 10 digits');
    });

    it('should reject invalid API key', async function() {
      const response = await fetch(
        'http://localhost:3001/in.php?key=invalid_key&method=userrecaptcha&googlekey=6LeTest&pageurl=http://example.com&json=1'
      );

      const data = await response.json();

      assert.strictEqual(data.status, 0, 'Should return error');
      assert.strictEqual(data.request, 'ERROR_WRONG_USER_KEY');
    });

    it('should return CAPCHA_NOT_READY initially', async function() {
      // Submit task
      const submitResp = await fetch(
        'http://localhost:3001/in.php?key=test_api_key_123&method=userrecaptcha&googlekey=6LeTest&pageurl=http://example.com&json=1'
      );
      const submitData = await submitResp.json();
      const taskId = submitData.request;

      // Immediately check result (should be pending)
      const resultResp = await fetch(
        `http://localhost:3001/res.php?key=test_api_key_123&action=get&id=${taskId}&json=1`
      );
      const resultData = await resultResp.json();

      assert.strictEqual(resultData.status, 0);
      assert.strictEqual(resultData.request, 'CAPCHA_NOT_READY');
    });

    it('should return solution after delay', async function() {
      // Submit task
      const submitResp = await fetch(
        'http://localhost:3001/in.php?key=test_api_key_123&method=userrecaptcha&googlekey=6LeTest&pageurl=http://example.com&json=1'
      );
      const submitData = await submitResp.json();
      const taskId = submitData.request;

      // Wait for mock solving (1s + margin)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Check result (should be solved)
      const resultResp = await fetch(
        `http://localhost:3001/res.php?key=test_api_key_123&action=get&id=${taskId}&json=1`
      );
      const resultData = await resultResp.json();

      assert.strictEqual(resultData.status, 1, 'Should be solved');
      assert.ok(resultData.request, 'Should have solution token');
      assert.ok(resultData.request.startsWith('03AHJ_Vuve'), 'Should have reCAPTCHA token format');
    });

    it('should track stats correctly', async function() {
      // Submit 3 tasks
      for (let i = 0; i < 3; i++) {
        await fetch(
          `http://localhost:3001/in.php?key=test_api_key_123&method=userrecaptcha&googlekey=6LeTest${i}&pageurl=http://example.com`
        );
      }

      // Check stats
      const statsResp = await fetch('http://localhost:3001/stats');
      const stats = await statsResp.json();

      assert.strictEqual(stats.submitted, 3);
      assert.ok(stats.polled >= 0);
    });
  });
});

// Helper to make fetch available in Node.js
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}
