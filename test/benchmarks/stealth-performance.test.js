/**
 * Performance Benchmarks: Stealth Modes vs Vanilla Playwright
 *
 * Measures performance overhead of different stealth implementations:
 * - puppeteer (legacy stealth)
 * - rebrowser-playwright (runtime patches)
 * - patchright (source-level patches)
 * - vanilla playwright (baseline, no stealth)
 *
 * Run with: BENCHMARK=true mocha test/benchmarks/stealth-performance.test.js --timeout 300000
 */

const assert = require('assert');
const { chromium: vanillaChromium } = require('playwright');
const { createBrowser } = require('../../utils/browser-factory');

// Skip benchmarks unless explicitly requested
const SHOULD_RUN = process.env.BENCHMARK === 'true';

(SHOULD_RUN ? describe : describe.skip)('Stealth Performance Benchmarks', function() {
  this.timeout(300000); // 5 minute timeout for comprehensive benchmarks

  const results = {
    vanilla: {},
    puppeteer: {},
    'rebrowser-playwright': {},
    patchright: {}
  };

  async function benchmark(name, fn, iterations = 5) {
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await fn();
      const end = Date.now();
      times.push(end - start);
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    return { avg, min, max, times };
  }

  describe('Browser Launch Performance', function() {
    it('should benchmark vanilla Playwright', async function() {
      const result = await benchmark('vanilla-launch', async () => {
        const browser = await vanillaChromium.launch({ headless: true });
        await browser.close();
      });

      results.vanilla.launch = result;
      console.log(`\n  ⏱️  Vanilla Playwright Launch: ${result.avg.toFixed(0)}ms (avg), ${result.min}-${result.max}ms (range)`);
    });

    it('should benchmark puppeteer mode', async function() {
      const originalMode = process.env.STEALTH_MODE;
      process.env.STEALTH_MODE = 'puppeteer';

      const result = await benchmark('puppeteer-launch', async () => {
        const { browser } = await createBrowser({ headless: true });
        await browser.close();
      });

      results.puppeteer.launch = result;
      console.log(`  ⏱️  Puppeteer Stealth Launch: ${result.avg.toFixed(0)}ms (avg), ${result.min}-${result.max}ms (range)`);

      process.env.STEALTH_MODE = originalMode;
    });

    it('should benchmark rebrowser-playwright mode', async function() {
      const originalMode = process.env.STEALTH_MODE;
      process.env.STEALTH_MODE = 'rebrowser-playwright';

      const result = await benchmark('rebrowser-launch', async () => {
        const { browser } = await createBrowser({ headless: true });
        await browser.close();
      });

      results['rebrowser-playwright'].launch = result;
      console.log(`  ⏱️  Rebrowser-Playwright Launch: ${result.avg.toFixed(0)}ms (avg), ${result.min}-${result.max}ms (range)`);

      process.env.STEALTH_MODE = originalMode;
    });

    it('should benchmark patchright mode', async function() {
      const originalMode = process.env.STEALTH_MODE;
      process.env.STEALTH_MODE = 'patchright';

      const result = await benchmark('patchright-launch', async () => {
        const { browser } = await createBrowser({ headless: true });
        await browser.close();
      });

      results.patchright.launch = result;
      console.log(`  ⏱️  Patchright Launch: ${result.avg.toFixed(0)}ms (avg), ${result.min}-${result.max}ms (range)`);

      process.env.STEALTH_MODE = originalMode;
    });
  });

  describe('Page Navigation Performance', function() {
    let vanillaBrowser, puppeteerBrowser, rebrowserBrowser, patchrightBrowser;

    before(async function() {
      // Launch all browsers once for navigation tests
      vanillaBrowser = await vanillaChromium.launch({ headless: true });

      process.env.STEALTH_MODE = 'puppeteer';
      puppeteerBrowser = (await createBrowser({ headless: true })).browser;

      process.env.STEALTH_MODE = 'rebrowser-playwright';
      rebrowserBrowser = (await createBrowser({ headless: true })).browser;

      process.env.STEALTH_MODE = 'patchright';
      patchrightBrowser = (await createBrowser({ headless: true })).browser;
    });

    after(async function() {
      if (vanillaBrowser) await vanillaBrowser.close();
      if (puppeteerBrowser) await puppeteerBrowser.close();
      if (rebrowserBrowser) await rebrowserBrowser.close();
      if (patchrightBrowser) await patchrightBrowser.close();
    });

    it('should benchmark vanilla navigation', async function() {
      const result = await benchmark('vanilla-nav', async () => {
        const page = await vanillaBrowser.newPage();
        await page.goto('https://example.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.close();
      });

      results.vanilla.navigation = result;
      console.log(`\n  🌐 Vanilla Navigation: ${result.avg.toFixed(0)}ms (avg), ${result.min}-${result.max}ms (range)`);
    });

    it('should benchmark puppeteer navigation', async function() {
      const result = await benchmark('puppeteer-nav', async () => {
        const page = await puppeteerBrowser.newPage();
        await page.goto('https://example.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.close();
      });

      results.puppeteer.navigation = result;
      console.log(`  🌐 Puppeteer Navigation: ${result.avg.toFixed(0)}ms (avg), ${result.min}-${result.max}ms (range)`);
    });

    it('should benchmark rebrowser-playwright navigation', async function() {
      const result = await benchmark('rebrowser-nav', async () => {
        const page = await rebrowserBrowser.newPage();
        await page.goto('https://example.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.close();
      });

      results['rebrowser-playwright'].navigation = result;
      console.log(`  🌐 Rebrowser-Playwright Navigation: ${result.avg.toFixed(0)}ms (avg), ${result.min}-${result.max}ms (range)`);
    });

    it('should benchmark patchright navigation', async function() {
      const result = await benchmark('patchright-nav', async () => {
        const page = await patchrightBrowser.newPage();
        await page.goto('https://example.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.close();
      });

      results.patchright.navigation = result;
      console.log(`  🌐 Patchright Navigation: ${result.avg.toFixed(0)}ms (avg), ${result.min}-${result.max}ms (range)`);
    });
  });

  describe('JavaScript Execution Performance', function() {
    let vanillaBrowser, puppeteerBrowser, rebrowserBrowser, patchrightBrowser;

    before(async function() {
      vanillaBrowser = await vanillaChromium.launch({ headless: true });

      process.env.STEALTH_MODE = 'puppeteer';
      puppeteerBrowser = (await createBrowser({ headless: true })).browser;

      process.env.STEALTH_MODE = 'rebrowser-playwright';
      rebrowserBrowser = (await createBrowser({ headless: true })).browser;

      process.env.STEALTH_MODE = 'patchright';
      patchrightBrowser = (await createBrowser({ headless: true })).browser;
    });

    after(async function() {
      if (vanillaBrowser) await vanillaBrowser.close();
      if (puppeteerBrowser) await puppeteerBrowser.close();
      if (rebrowserBrowser) await rebrowserBrowser.close();
      if (patchrightBrowser) await patchrightBrowser.close();
    });

    const jsCode = `
      const results = [];
      for (let i = 0; i < 1000; i++) {
        results.push(Math.sqrt(i) * Math.random());
      }
      return results.reduce((a, b) => a + b, 0);
    `;

    it('should benchmark vanilla JS execution', async function() {
      const page = await vanillaBrowser.newPage();

      const result = await benchmark('vanilla-js', async () => {
        await page.evaluate(jsCode);
      }, 10);

      results.vanilla.jsExecution = result;
      console.log(`\n  ⚡ Vanilla JS Execution: ${result.avg.toFixed(2)}ms (avg), ${result.min.toFixed(2)}-${result.max.toFixed(2)}ms (range)`);

      await page.close();
    });

    it('should benchmark puppeteer JS execution', async function() {
      const page = await puppeteerBrowser.newPage();

      const result = await benchmark('puppeteer-js', async () => {
        await page.evaluate(jsCode);
      }, 10);

      results.puppeteer.jsExecution = result;
      console.log(`  ⚡ Puppeteer JS Execution: ${result.avg.toFixed(2)}ms (avg), ${result.min.toFixed(2)}-${result.max.toFixed(2)}ms (range)`);

      await page.close();
    });

    it('should benchmark rebrowser-playwright JS execution', async function() {
      const page = await rebrowserBrowser.newPage();

      const result = await benchmark('rebrowser-js', async () => {
        await page.evaluate(jsCode);
      }, 10);

      results['rebrowser-playwright'].jsExecution = result;
      console.log(`  ⚡ Rebrowser-Playwright JS Execution: ${result.avg.toFixed(2)}ms (avg), ${result.min.toFixed(2)}-${result.max.toFixed(2)}ms (range)`);

      await page.close();
    });

    it('should benchmark patchright JS execution', async function() {
      const page = await patchrightBrowser.newPage();

      const result = await benchmark('patchright-js', async () => {
        await page.evaluate(jsCode);
      }, 10);

      results.patchright.jsExecution = result;
      console.log(`  ⚡ Patchright JS Execution: ${result.avg.toFixed(2)}ms (avg), ${result.min.toFixed(2)}-${result.max.toFixed(2)}ms (range)`);

      await page.close();
    });
  });

  after(function() {
    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('           PERFORMANCE SUMMARY');
    console.log('═══════════════════════════════════════════════════════\n');

    const modes = ['vanilla', 'puppeteer', 'rebrowser-playwright', 'patchright'];
    const metrics = ['launch', 'navigation', 'jsExecution'];

    metrics.forEach(metric => {
      const metricName = {
        launch: 'Browser Launch',
        navigation: 'Page Navigation',
        jsExecution: 'JS Execution'
      }[metric];

      console.log(`\n📊 ${metricName}:`);
      console.log('─'.repeat(60));

      const vanillaTime = results.vanilla[metric]?.avg || 0;

      modes.forEach(mode => {
        const data = results[mode][metric];
        if (!data) return;

        const overhead = vanillaTime > 0 ? ((data.avg - vanillaTime) / vanillaTime * 100) : 0;
        const overheadStr = overhead > 0 ? `+${overhead.toFixed(1)}%` : `${overhead.toFixed(1)}%`;

        console.log(`  ${mode.padEnd(22)} ${data.avg.toFixed(0).padStart(6)}ms  (${overheadStr} vs vanilla)`);
      });
    });

    console.log('\n═══════════════════════════════════════════════════════\n');
  });
});
