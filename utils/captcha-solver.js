/**
 * CAPTCHA Solver Utility for GDPR Opt-Out Automation (Phase 2A)
 *
 * This module provides automated CAPTCHA solving using 2Captcha API
 * with fallback to manual user solving for hybrid automation.
 *
 * Supports:
 * - reCAPTCHA v2 (checkbox + image challenges)
 * - reCAPTCHA v3 (invisible, score-based)
 * - hCaptcha
 * - Cloudflare Turnstile
 *
 * Framework-agnostic: Works with Puppeteer, Playwright, and Patchright
 *
 * Usage:
 *   const { detectCaptcha, solveCaptcha } = require('./utils/captcha-solver');
 *   const captcha = await detectCaptcha(page);
 *   if (captcha) {
 *     await solveCaptcha(page, captcha);
 *   }
 */

const https = require('https');
const { promisify } = require('util');

// Load environment variables
require('dotenv').config();

const CAPTCHA_ENABLED = process.env.CAPTCHA_ENABLED === 'true';
const API_PROVIDER = process.env.CAPTCHA_API_PROVIDER || '2captcha';
const API_KEY = process.env.CAPTCHA_API_KEY;

// API endpoints for different providers
const API_ENDPOINTS = {
  '2captcha': {
    submit: 'https://2captcha.com/in.php',
    result: 'https://2captcha.com/res.php'
  },
  'anti-captcha': {
    submit: 'https://api.anti-captcha.com/createTask',
    result: 'https://api.anti-captcha.com/getTaskResult'
  },
  'capsolver': {
    submit: 'https://api.capsolver.com/createTask',
    result: 'https://api.capsolver.com/getTaskResult'
  }
};

/**
 * Detects CAPTCHA on the current page
 * @param {Page} page - Puppeteer/Playwright page object
 * @returns {Object|null} CAPTCHA information or null if not found
 */
async function detectCaptcha(page) {
  try {
    // Check for reCAPTCHA v2
    const recaptchaV2 = await page.evaluate(() => {
      const element = document.querySelector('.g-recaptcha, iframe[src*="recaptcha"]');
      if (element) {
        const sitekey = element.getAttribute('data-sitekey') ||
                       document.querySelector('[data-sitekey]')?.getAttribute('data-sitekey');
        return { type: 'recaptcha_v2', sitekey, element: true };
      }
      return null;
    });
    if (recaptchaV2) return { ...recaptchaV2, pageUrl: page.url() };

    // Check for reCAPTCHA v3 (invisible)
    const recaptchaV3 = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      const recaptchaScript = scripts.find(s => s.src.includes('recaptcha') && s.src.includes('render='));
      if (recaptchaScript) {
        const match = recaptchaScript.src.match(/render=([^&]+)/);
        const sitekey = match ? match[1] : null;
        return { type: 'recaptcha_v3', sitekey };
      }
      return null;
    });
    if (recaptchaV3) return { ...recaptchaV3, pageUrl: page.url() };

    // Check for hCaptcha
    const hcaptcha = await page.evaluate(() => {
      const element = document.querySelector('.h-captcha, iframe[src*="hcaptcha"]');
      if (element) {
        const sitekey = element.getAttribute('data-sitekey');
        return { type: 'hcaptcha', sitekey, element: true };
      }
      return null;
    });
    if (hcaptcha) return { ...hcaptcha, pageUrl: page.url() };

    // Check for Cloudflare Turnstile
    const turnstile = await page.evaluate(() => {
      const element = document.querySelector('[data-sitekey]');
      if (element && document.body.innerHTML.includes('turnstile')) {
        const sitekey = element.getAttribute('data-sitekey');
        return { type: 'turnstile', sitekey, element: true };
      }
      return null;
    });
    if (turnstile) return { ...turnstile, pageUrl: page.url() };

    return null;
  } catch (error) {
    console.error('Error detecting CAPTCHA:', error.message);
    return null;
  }
}

/**
 * Solves CAPTCHA using API or manual fallback
 * @param {Page} page - Puppeteer/Playwright page object
 * @param {Object} captcha - CAPTCHA information from detectCaptcha()
 * @param {Object} options - Additional options
 * @returns {Object} Solution result
 */
async function solveCaptcha(page, captcha, options = {}) {
  const { onManualFallback, verbose = true } = options;

  if (verbose) {
    console.log(`\n🔍 CAPTCHA Detected: ${captcha.type}`);
    console.log(`   Page: ${captcha.pageUrl}`);
    console.log(`   Sitekey: ${captcha.sitekey || 'N/A'}`);
  }

  // Try automated solving if enabled
  if (CAPTCHA_ENABLED && API_KEY) {
    try {
      if (verbose) console.log(`\n🤖 Attempting automated solve via ${API_PROVIDER}...`);

      const startTime = Date.now();
      const solution = await solveViaAPI(captcha);
      const solveTime = ((Date.now() - startTime) / 1000).toFixed(1);

      if (verbose) console.log(`✅ CAPTCHA solved in ${solveTime}s`);

      // Inject solution into page
      await injectSolution(page, captcha, solution);

      return {
        success: true,
        method: 'api',
        provider: API_PROVIDER,
        solveTime: parseFloat(solveTime),
        cost: estimateCost(captcha.type)
      };
    } catch (error) {
      if (verbose) {
        console.log(`⚠️  API solving failed: ${error.message}`);
        console.log(`   Falling back to manual solving...`);
      }
    }
  }

  // Manual solving fallback
  if (verbose) {
    console.log(`\n⏸️  Manual CAPTCHA solving required`);
    console.log(`   Please solve the CAPTCHA in the browser window.`);
    console.log(`   Type 'done' when complete, or 'skip' to skip this broker.`);
  }

  if (onManualFallback) {
    await onManualFallback(captcha);
  }

  // In Phase 2A, this would integrate with Claude Code's conversational flow
  // For now, we return a pending state that Claude Code can handle
  return {
    success: true,
    method: 'manual',
    requiresUserAction: true
  };
}

/**
 * Solves CAPTCHA via API (2Captcha implementation)
 * @param {Object} captcha - CAPTCHA information
 * @returns {Promise<string>} Solution token
 */
async function solveViaAPI(captcha) {
  if (API_PROVIDER !== '2captcha') {
    throw new Error(`Provider ${API_PROVIDER} not yet implemented. Use 2captcha for now.`);
  }

  // Step 1: Submit CAPTCHA to 2Captcha
  const taskId = await submit2Captcha(captcha);

  // Step 2: Poll for solution (typically takes 15-40s)
  const solution = await poll2CaptchaResult(taskId);

  return solution;
}

/**
 * Submits CAPTCHA to 2Captcha API
 */
async function submit2Captcha(captcha) {
  const params = new URLSearchParams({
    key: API_KEY,
    json: 1,
    pageurl: captcha.pageUrl,
    googlekey: captcha.sitekey
  });

  // Determine method based on CAPTCHA type
  if (captcha.type === 'recaptcha_v2') {
    params.append('method', 'userrecaptcha');
  } else if (captcha.type === 'recaptcha_v3') {
    params.append('method', 'userrecaptcha');
    params.append('version', 'v3');
    params.append('action', 'submit'); // Default action
    params.append('min_score', '0.3'); // Accept scores >= 0.3
  } else if (captcha.type === 'hcaptcha') {
    params.append('method', 'hcaptcha');
  } else if (captcha.type === 'turnstile') {
    params.append('method', 'turnstile');
  }

  const response = await httpRequest(`${API_ENDPOINTS['2captcha'].submit}?${params}`);
  const result = JSON.parse(response);

  if (result.status !== 1) {
    throw new Error(result.request || 'Failed to submit CAPTCHA');
  }

  return result.request;
}

/**
 * Polls 2Captcha for solution
 */
async function poll2CaptchaResult(taskId, maxAttempts = 40) {
  const params = new URLSearchParams({
    key: API_KEY,
    action: 'get',
    id: taskId,
    json: 1
  });

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await sleep(5000); // Wait 5 seconds between polls

    const response = await httpRequest(`${API_ENDPOINTS['2captcha'].result}?${params}`);
    const result = JSON.parse(response);

    if (result.status === 1) {
      return result.request;
    }

    if (result.request !== 'CAPCHA_NOT_READY') {
      throw new Error(result.request || 'Unknown error from 2Captcha');
    }
  }

  throw new Error('Timeout waiting for CAPTCHA solution (200s)');
}

/**
 * Injects CAPTCHA solution into page
 */
async function injectSolution(page, captcha, solution) {
  if (captcha.type === 'recaptcha_v2' || captcha.type === 'recaptcha_v3') {
    await page.evaluate((token) => {
      // Set the response token
      document.getElementById('g-recaptcha-response').innerHTML = token;

      // Try to find and trigger callback if it exists
      if (typeof grecaptcha !== 'undefined') {
        try {
          grecaptcha.enterprise = grecaptcha.enterprise || {};
          const widgets = document.querySelectorAll('.g-recaptcha');
          if (widgets.length > 0) {
            const widgetId = Array.from(widgets[0].classList).find(c => c.startsWith('g-recaptcha-'));
            if (widgetId) {
              const callback = widgets[0].getAttribute('data-callback');
              if (callback && typeof window[callback] === 'function') {
                window[callback](token);
              }
            }
          }
        } catch (e) {
          console.log('Could not trigger callback:', e);
        }
      }
    }, solution);
  } else if (captcha.type === 'hcaptcha') {
    await page.evaluate((token) => {
      document.querySelector('[name="h-captcha-response"]').innerHTML = token;
      document.querySelector('[name="g-recaptcha-response"]').innerHTML = token;
    }, solution);
  } else if (captcha.type === 'turnstile') {
    await page.evaluate((token) => {
      const input = document.querySelector('[name="cf-turnstile-response"]');
      if (input) input.value = token;
    }, solution);
  }

  // Small delay to let the page process the solution
  await sleep(500);
}

/**
 * Estimates cost for CAPTCHA type
 */
function estimateCost(captchaType) {
  const costs = {
    'recaptcha_v2': 0.001,   // $1 per 1000
    'recaptcha_v3': 0.001,   // $1 per 1000
    'hcaptcha': 0.001,       // $1 per 1000
    'turnstile': 0.001       // $1 per 1000
  };
  return costs[captchaType] || 0.001;
}

/**
 * Helper: HTTP GET request
 */
function httpRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

/**
 * Helper: Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Gets current API balance (2Captcha only)
 */
async function getBalance() {
  if (!API_KEY || API_PROVIDER !== '2captcha') {
    return null;
  }

  try {
    const response = await httpRequest(
      `${API_ENDPOINTS['2captcha'].result}?key=${API_KEY}&action=getbalance&json=1`
    );
    const result = JSON.parse(response);
    return result.request ? parseFloat(result.request) : null;
  } catch (error) {
    console.error('Failed to get balance:', error.message);
    return null;
  }
}

/**
 * Validates API configuration
 */
function validateConfig() {
  const issues = [];

  if (!CAPTCHA_ENABLED) {
    return { valid: false, reason: 'CAPTCHA_ENABLED is false (manual mode)' };
  }

  if (!API_KEY) {
    issues.push('CAPTCHA_API_KEY not set in .env');
  }

  if (!API_ENDPOINTS[API_PROVIDER]) {
    issues.push(`Unknown provider: ${API_PROVIDER}`);
  }

  if (API_PROVIDER !== '2captcha') {
    issues.push(`Provider ${API_PROVIDER} not yet implemented`);
  }

  if (issues.length > 0) {
    return { valid: false, issues };
  }

  return { valid: true };
}

module.exports = {
  detectCaptcha,
  solveCaptcha,
  getBalance,
  validateConfig,
  CAPTCHA_ENABLED
};
