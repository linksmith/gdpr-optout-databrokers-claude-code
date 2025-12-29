#!/usr/bin/env node

/**
 * Proof-of-Concept: CAPTCHA Solver Test Script
 *
 * This script demonstrates the CAPTCHA solving functionality
 * by testing on a broker with known CAPTCHA requirements.
 *
 * Usage:
 *   1. Set up .env with CAPTCHA_API_KEY
 *   2. npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth dotenv
 *   3. node utils/test-captcha-solver.js [broker-id]
 *
 * Example:
 *   node utils/test-captcha-solver.js truepeoplesearch
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { detectCaptcha, solveCaptcha, getBalance, validateConfig } = require('./captcha-solver');
const fs = require('fs');
const path = require('path');

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

// Test broker configurations
const TEST_BROKERS = {
  'truepeoplesearch': {
    name: 'TruePeopleSearch',
    url: 'https://www.truepeoplesearch.com/removal',
    hasCaptcha: true,
    expectedType: 'recaptcha_v2'
  },
  'fastpeoplesearch': {
    name: 'FastPeopleSearch',
    url: 'https://www.fastpeoplesearch.com/removal',
    hasCaptcha: true,
    expectedType: 'recaptcha_v2'
  },
  'familytreenow': {
    name: 'FamilyTreeNow',
    url: 'https://www.familytreenow.com/optout',
    hasCaptcha: true,
    expectedType: 'recaptcha_v2'
  },
  'spokeo': {
    name: 'Spokeo',
    url: 'https://www.spokeo.com/optout',
    hasCaptcha: false,
    expectedType: 'none'
  }
};

async function runTest(brokerId = 'truepeoplesearch') {
  console.log('🧪 CAPTCHA Solver - Proof of Concept Test\n');
  console.log('==========================================\n');

  // Validate broker
  const broker = TEST_BROKERS[brokerId];
  if (!broker) {
    console.error(`❌ Unknown broker: ${brokerId}`);
    console.log('Available brokers:', Object.keys(TEST_BROKERS).join(', '));
    process.exit(1);
  }

  console.log(`Testing with: ${broker.name}`);
  console.log(`URL: ${broker.url}`);
  console.log(`Expected CAPTCHA: ${broker.expectedType}\n`);

  // Validate configuration
  console.log('📋 Validating configuration...');
  const config = validateConfig();
  if (!config.valid) {
    console.log(`⚠️  ${config.reason || 'Configuration invalid'}`);
    if (config.issues) {
      config.issues.forEach(issue => console.log(`   - ${issue}`));
    }
    console.log('\n💡 Running in manual mode (no API solving)\n');
  } else {
    console.log('✅ Configuration valid\n');

    // Check API balance
    console.log('💰 Checking API balance...');
    const balance = await getBalance();
    if (balance !== null) {
      console.log(`   Balance: $${balance.toFixed(2)}`);
      if (balance < 1) {
        console.log('   ⚠️  Low balance. Add funds at https://2captcha.com\n');
      } else {
        console.log('   ✅ Sufficient balance\n');
      }
    }
  }

  // Launch browser
  console.log('🌐 Launching browser...');
  const browser = await puppeteer.launch({
    headless: false,  // Show browser for demonstration
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-dev-shm-usage'
    ]
  });

  const page = await browser.newPage();

  // Set realistic viewport
  await page.setViewport({ width: 1920, height: 1080 });

  // Set realistic user agent
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  );

  console.log(`   ✅ Browser launched\n`);

  try {
    // Navigate to opt-out page
    console.log(`🔗 Navigating to ${broker.name}...`);
    await page.goto(broker.url, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('   ✅ Page loaded\n');

    // Wait a bit for any dynamic content
    await sleep(2000);

    // Detect CAPTCHA
    console.log('🔍 Detecting CAPTCHA...');
    const captcha = await detectCaptcha(page);

    if (!captcha) {
      console.log('   ℹ️  No CAPTCHA detected on this page\n');

      if (broker.hasCaptcha) {
        console.log('   ⚠️  This broker usually has a CAPTCHA.');
        console.log('   It may appear after filling the form or on submission.\n');
      }
    } else {
      console.log(`   ✅ CAPTCHA detected!`);
      console.log(`      Type: ${captcha.type}`);
      console.log(`      Sitekey: ${captcha.sitekey || 'N/A'}\n`);

      // Verify expected type
      if (broker.expectedType !== 'none' && captcha.type !== broker.expectedType) {
        console.log(`   ⚠️  Expected ${broker.expectedType}, found ${captcha.type}\n`);
      }

      // Solve CAPTCHA
      console.log('🤖 Attempting to solve CAPTCHA...\n');

      const result = await solveCaptcha(page, captcha, {
        verbose: true,
        onManualFallback: async (captcha) => {
          console.log('\n⏸️  Browser paused for manual solving.');
          console.log('   The browser window will stay open.');
          console.log('   Solve the CAPTCHA manually, then press Ctrl+C to exit.\n');
        }
      });

      console.log('\n📊 Solve Result:');
      console.log(`   Success: ${result.success}`);
      console.log(`   Method: ${result.method}`);
      if (result.provider) console.log(`   Provider: ${result.provider}`);
      if (result.solveTime) console.log(`   Time: ${result.solveTime}s`);
      if (result.cost) console.log(`   Cost: $${result.cost.toFixed(4)}`);

      if (result.requiresUserAction) {
        console.log('\n⏸️  Waiting for manual CAPTCHA solving...');
        console.log('   Solve the CAPTCHA in the browser, then press Enter to continue.');

        // Wait for user input
        await new Promise(resolve => {
          process.stdin.once('data', () => resolve());
        });
      }

      // Take screenshot
      const screenshotPath = path.join(__dirname, '..', 'data', 'screenshots', `test-${brokerId}-${Date.now()}.png`);
      await fs.promises.mkdir(path.dirname(screenshotPath), { recursive: true });
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`\n📸 Screenshot saved: ${screenshotPath}`);
    }

    console.log('\n✅ Test complete!\n');
    console.log('💡 Next steps:');
    console.log('   1. Review the browser window');
    console.log('   2. Check if CAPTCHA was solved correctly');
    console.log('   3. If using API, verify solve time and cost');
    console.log('   4. Try submitting the form to test full flow\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }

  // Keep browser open for inspection
  console.log('🌐 Browser will stay open for 60 seconds for inspection...');
  console.log('   Press Ctrl+C to exit early.\n');

  await sleep(60000);
  await browser.close();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Parse command line arguments
const brokerId = process.argv[2] || 'truepeoplesearch';

// Run test
runTest(brokerId).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
