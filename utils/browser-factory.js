/**
 * Browser Factory for Multi-Stealth Architecture (Phase 2B)
 *
 * Provides unified browser creation across three stealth implementations:
 * 1. puppeteer: Legacy puppeteer-extra-plugin-stealth (basic)
 * 2. rebrowser-playwright: Modern rebrowser-patches (recommended)
 * 3. patchright: Source-level patched Playwright (maximum stealth)
 *
 * All return a unified interface with browser.newPage() and page.goto/evaluate/etc
 */

const fs = require('fs').promises;
const path = require('path');

// Load environment variables
require('dotenv').config();

/**
 * Get current stealth mode from environment
 */
function getStealthMode() {
  return process.env.STEALTH_MODE || 'rebrowser-playwright';
}

/**
 * Create browser instance with selected stealth mode
 * @param {Object} options - Browser launch options
 * @returns {Promise<{browser: Object, mode: String}>}
 */
async function createBrowser(options = {}) {
  const STEALTH_MODE = getStealthMode();

  const defaultOptions = {
    headless: options.headless !== false, // default true
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--window-size=1920,1080'
    ],
    ...options
  };

  switch (STEALTH_MODE) {
    case 'puppeteer':
      return createPuppeteerBrowser(defaultOptions);

    case 'rebrowser-playwright':
      return createRebrowserPlaywrightBrowser(defaultOptions);

    case 'patchright':
      return createPatchrightBrowser(defaultOptions);

    default:
      console.warn(`Unknown STEALTH_MODE: ${STEALTH_MODE}, falling back to rebrowser-playwright`);
      return createRebrowserPlaywrightBrowser(defaultOptions);
  }
}

/**
 * Legacy Puppeteer with puppeteer-extra-plugin-stealth
 */
async function createPuppeteerBrowser(options) {
  const puppeteer = require('puppeteer-extra');
  const StealthPlugin = require('puppeteer-extra-plugin-stealth');

  puppeteer.use(StealthPlugin());

  const browser = await puppeteer.launch({
    headless: options.headless,
    args: options.args,
    defaultViewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true
  });

  return { browser, mode: 'puppeteer' };
}

/**
 * Rebrowser Playwright with runtime-toggleable patches
 */
async function createRebrowserPlaywrightBrowser(options) {
  const { chromium } = require('rebrowser-playwright');

  // Disable problematic runtime fix to avoid auxData errors
  // The patches will still work for stealth, but without breaking page.evaluate()
  delete process.env.REBROWSER_PATCHES_RUNTIME_FIX_MODE;

  const browser = await chromium.launch({
    headless: options.headless,
    args: options.args
  });

  // Wrap browser to add init script on page creation
  const originalNewPage = browser.newPage.bind(browser);
  browser.newPage = async (...args) => {
    const page = await originalNewPage(...args);

    // Inject script to remove navigator.webdriver
    await page.addInitScript(() => {
      delete Object.getPrototypeOf(navigator).webdriver;
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true
      });
    });

    return page;
  };

  return { browser, mode: 'rebrowser-playwright' };
}

/**
 * Patchright with persistent context (best practice for maximum stealth)
 */
async function createPatchrightBrowser(options) {
  const { chromium } = require('patchright');

  // For Patchright, use persistent context for best stealth
  // This is the recommended approach from Patchright docs
  const userDataDir = path.join(__dirname, '..', 'data', '.patchright-profile');

  // Ensure directory exists
  try {
    await fs.mkdir(userDataDir, { recursive: true });
  } catch (err) {
    // Directory might already exist
  }

  // Enhanced args for better stealth with Patchright
  const patchrightArgs = [
    ...options.args,
    '--disable-blink-features=AutomationControlled',
    '--exclude-switches=enable-automation',
    '--disable-dev-shm-usage'
  ];

  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: options.headless,
    args: patchrightArgs,
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
    // Patchright-specific: use real Chrome user agent
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    // Additional stealth settings
    locale: 'en-US',
    timezoneId: 'America/New_York',
    permissions: [],
    // IMPORTANT: This helps hide automation signals
    bypassCSP: false
  });

  // Stealth script to override Patchright's navigator.webdriver = false
  const stealthScriptFunc = () => {
    Object.defineProperty(Object.getPrototypeOf(navigator), 'webdriver', {
      get: () => undefined,
      configurable: true,
      enumerable: true
    });
  };

  // Apply init script at CONTEXT level (persistent context)
  // This should affect all pages and all navigations
  await browser.addInitScript(stealthScriptFunc);

  // For Patchright persistent context, browser IS the context
  // Wrap it to provide .newPage() method for compatibility
  const wrappedBrowser = {
    newPage: async () => {
      // In persistent context, pages already exist or we create new ones
      const pages = browser.pages();
      let page;

      if (pages.length > 0) {
        page = pages[0];
        // For existing pages, apply fix immediately since they're already loaded
        try {
          await page.evaluate(stealthScriptFunc);
        } catch (e) {
          // Page might not be ready
        }
      } else {
        page = await browser.newPage();
      }

      return page;
    },
    close: () => browser.close(),
    pages: () => browser.pages(),
    // Expose the actual context for direct access if needed
    _context: browser
  };

  return { browser: wrappedBrowser, mode: 'patchright' };
}

/**
 * Validate stealth configuration
 */
function validateStealthConfig() {
  const STEALTH_MODE = getStealthMode();
  const validModes = ['puppeteer', 'rebrowser-playwright', 'patchright'];

  if (!validModes.includes(STEALTH_MODE)) {
    return {
      valid: false,
      message: `Invalid STEALTH_MODE: ${STEALTH_MODE}. Must be one of: ${validModes.join(', ')}`
    };
  }

  return { valid: true };
}

module.exports = {
  createBrowser,
  getStealthMode,
  validateStealthConfig
};
