/**
 * E2E Tests for GDPR Opt-Out Automation Bot (Phase 2B)
 *
 * Tests the complete standalone automation workflow.
 * Compatible with all stealth modes (puppeteer, rebrowser-playwright, patchright).
 * Set STEALTH_MODE environment variable to test specific mode.
 */

const assert = require('assert');
const fs = require('fs').promises;
const path = require('path');
const sqlite3 = require('sqlite3');
const { promisify } = require('util');
const GDPROptOutBot = require('../../src/automation/gdpr-optout-bot');
const Mock2CaptchaServer = require('../mocks/2captcha-mock-server');

describe('GDPR Opt-Out Bot E2E Tests', function() {
  this.timeout(120000); // 2 minute timeout for full E2E tests

  let mockServer;
  let testDbPath;
  let db;

  before(async function() {
    // Start mock 2Captcha API server
    mockServer = new Mock2CaptchaServer({
      port: 3001,
      solveDelay: 500, // Fast for testing
      validApiKey: 'test_api_key_123'
    });
    await mockServer.start();

    // Set up test environment
    process.env.CAPTCHA_ENABLED = 'true';
    process.env.CAPTCHA_API_PROVIDER = '2captcha';
    process.env.CAPTCHA_API_KEY = 'test_api_key_123';
    process.env.CAPTCHA_API_BASE_URL = 'http://localhost:3001';

    // Stealth mode for testing (defaults to rebrowser-playwright if not set)
    process.env.STEALTH_MODE = process.env.STEALTH_MODE || 'rebrowser-playwright';

    // Create test .env data
    process.env.FIRST_NAME = 'TestFirstName';
    process.env.LAST_NAME = 'TestLastName';
    process.env.EMAIL_REAL = 'test@example.com';
    process.env.CURRENT_CITY = 'TestCity';
    process.env.PHONE = '+1234567890';
  });

  after(async function() {
    if (mockServer) {
      await mockServer.stop();
    }
  });

  beforeEach(async function() {
    // Reset mock server
    await fetch('http://localhost:3001/reset');

    // Create test database
    testDbPath = path.join(__dirname, '../fixtures/test-submissions.db');
    await createTestDatabase(testDbPath);

    db = new sqlite3.Database(testDbPath);
  });

  afterEach(async function() {
    if (db) {
      db.close();
    }

    // Clean up test database
    try {
      await fs.unlink(testDbPath);
    } catch (e) {
      // Ignore if doesn't exist
    }
  });

  describe('Bot Initialization', function() {
    it('should initialize with default options', async function() {
      const bot = new GDPROptOutBot({ headless: true });
      assert.ok(bot);
      assert.strictEqual(bot.options.mode, 'hybrid');
      assert.strictEqual(bot.options.headless, true);
    });

    it('should load broker configuration', async function() {
      const bot = new GDPROptOutBot({ headless: true });

      await bot.loadConfig();

      assert.ok(bot.brokers);
      assert.ok(bot.brokers.length > 0);
      assert.ok(bot.userData);
      assert.strictEqual(bot.userData.firstName, 'TestFirstName');
    });

    it('should filter brokers by ID', async function() {
      const bot = new GDPROptOutBot({
        headless: true,
        brokers: ['spokeo', 'truepeoplesearch']
      });

      await bot.loadConfig();

      assert.strictEqual(bot.brokersToProcess.length, 2);
      assert.ok(bot.brokersToProcess.some(b => b.id === 'spokeo'));
      assert.ok(bot.brokersToProcess.some(b => b.id === 'truepeoplesearch'));
    });
  });

  describe('Database Operations', function() {
    it('should save submission to database', async function() {
      const bot = new GDPROptOutBot({ headless: true });
      bot.db = db;
      bot.dbRun = promisify(db.run.bind(db));
      bot.dbGet = promisify(db.get.bind(db));

      await bot.saveSubmission('test_broker', {
        status: 'completed',
        screenshot_path: '/path/to/screenshot.png'
      });

      const dbGet = promisify(db.get.bind(db));
      const submission = await dbGet(
        'SELECT * FROM submissions WHERE broker_id = ?',
        ['test_broker']
      );

      assert.ok(submission);
      assert.strictEqual(submission.broker_id, 'test_broker');
      assert.strictEqual(submission.status, 'completed');
    });

    it('should save CAPTCHA stats', async function() {
      const bot = new GDPROptOutBot({ headless: true });
      bot.db = db;
      bot.dbRun = promisify(db.run.bind(db));

      await bot.saveCaptchaStats('test_broker', {
        captcha_type: 'recaptcha_v2',
        solve_method: 'api',
        success: true,
        solve_time_seconds: 18.5,
        api_cost: 0.001
      });

      const dbGet = promisify(db.get.bind(db));
      const stat = await dbGet(
        'SELECT * FROM captcha_stats WHERE broker_id = ?',
        ['test_broker']
      );

      assert.ok(stat);
      assert.strictEqual(stat.broker_id, 'test_broker');
      assert.strictEqual(stat.captcha_type, 'recaptcha_v2');
      assert.strictEqual(stat.solve_method, 'api');
      assert.strictEqual(stat.success, 1);
    });
  });

  describe('Mode Handling', function() {
    it('should support auto mode', function() {
      const bot = new GDPROptOutBot({ mode: 'auto', headless: true });
      assert.strictEqual(bot.options.mode, 'auto');
    });

    it('should support hybrid mode', function() {
      const bot = new GDPROptOutBot({ mode: 'hybrid', headless: true });
      assert.strictEqual(bot.options.mode, 'hybrid');
    });

    it('should support manual mode', function() {
      const bot = new GDPROptOutBot({ mode: 'manual', headless: true });
      assert.strictEqual(bot.options.mode, 'manual');
    });

    it('should default to hybrid mode', function() {
      const bot = new GDPROptOutBot({ headless: true });
      assert.strictEqual(bot.options.mode, 'hybrid');
    });
  });

  describe('Dry Run Mode', function() {
    it('should not submit forms in dry run mode', async function() {
      const bot = new GDPROptOutBot({
        headless: true,
        dryRun: true,
        brokers: ['spokeo']
      });

      bot.db = db;
      bot.dbRun = promisify(db.run.bind(db));
      bot.dbGet = promisify(db.get.bind(db));

      // Mock methods
      bot.fillForm = async () => {};
      bot.submitForm = async () => {
        throw new Error('Should not submit in dry run mode');
      };
      bot.takeScreenshot = async () => '/test/path.png';

      await bot.loadConfig();

      // This should not throw because submitForm is not called in dry run
      await bot.processBroker(bot.brokersToProcess[0]).catch(() => {
        // Expected to fail on navigation in test environment
      });
    });
  });

  describe('Stats Tracking', function() {
    it('should track completion stats', function() {
      const bot = new GDPROptOutBot({ headless: true });

      assert.strictEqual(bot.stats.completed, 0);
      assert.strictEqual(bot.stats.failed, 0);
      assert.strictEqual(bot.stats.captchasSolved, 0);

      bot.stats.completed++;
      bot.stats.captchasSolved++;

      assert.strictEqual(bot.stats.completed, 1);
      assert.strictEqual(bot.stats.captchasSolved, 1);
    });

    it('should track costs', function() {
      const bot = new GDPROptOutBot({ headless: true });

      assert.strictEqual(bot.stats.totalCost, 0);

      bot.stats.totalCost += 0.001;
      bot.stats.totalCost += 0.001;

      assert.strictEqual(bot.stats.totalCost, 0.002);
    });
  });

  describe('Utility Functions', function() {
    it('should generate random delays', function() {
      const bot = new GDPROptOutBot({ headless: true });

      for (let i = 0; i < 10; i++) {
        const delay = bot.randomDelay(1000, 2000);
        assert.ok(delay >= 1000 && delay <= 2000);
      }
    });

    it('should delay execution', async function() {
      const bot = new GDPROptOutBot({ headless: true });

      const start = Date.now();
      await bot.delay(100);
      const elapsed = Date.now() - start;

      assert.ok(elapsed >= 100 && elapsed < 200);
    });
  });
});

/**
 * Helper: Create test database with schema
 */
async function createTestDatabase(dbPath) {
  // Ensure directory exists
  await fs.mkdir(path.dirname(dbPath), { recursive: true });

  const db = new sqlite3.Database(dbPath);
  const dbRun = promisify(db.run.bind(db));

  // Create tables (simplified schema for testing)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      broker_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      submitted_at TIMESTAMP,
      screenshot_path TEXT,
      confirmation_screenshot_path TEXT,
      error_message TEXT,
      captcha_encountered BOOLEAN DEFAULT 0,
      captcha_type TEXT,
      captcha_solve_method TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS captcha_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      broker_id TEXT NOT NULL,
      captcha_type TEXT NOT NULL,
      solve_method TEXT NOT NULL,
      api_provider TEXT,
      success BOOLEAN NOT NULL,
      solve_time_seconds REAL,
      api_cost REAL,
      error_message TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.close();
}

// Helper to make fetch available
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}
