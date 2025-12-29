/**
 * Mock 2Captcha API Server for Testing
 *
 * Mimics the real 2Captcha API endpoints:
 * - POST/GET /in.php (submit CAPTCHA)
 * - GET /res.php (get result)
 *
 * Based on official 2Captcha API documentation:
 * https://2captcha.com/2captcha-api
 * https://2captcha.com/api-docs/recaptcha-v2
 */

const http = require('http');
const url = require('url');
const querystring = require('querystring');

class Mock2CaptchaServer {
  constructor(options = {}) {
    this.port = options.port || 3001;
    this.tasks = new Map(); // taskId => task data
    this.config = {
      solveDelay: options.solveDelay || 2000, // Mock solve time (2s for testing)
      failureRate: options.failureRate || 0, // 0-1, probability of failure
      validApiKey: options.validApiKey || 'test_api_key_123',
      ...options
    };
    this.server = null;
    this.stats = {
      submitted: 0,
      solved: 0,
      failed: 0,
      polled: 0
    };
  }

  start() {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => this.handleRequest(req, res));
      this.server.listen(this.port, () => {
        console.log(`Mock 2Captcha API server running on http://localhost:${this.port}`);
        resolve();
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Mock 2Captcha API server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Set CORS headers for testing
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (pathname === '/in.php') {
      this.handleSubmit(req, res, parsedUrl.query);
    } else if (pathname === '/res.php') {
      this.handleResult(req, res, parsedUrl.query);
    } else if (pathname === '/reset') {
      // Test helper endpoint
      this.reset();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', message: 'Server reset' }));
    } else if (pathname === '/stats') {
      // Test helper endpoint
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(this.stats));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  }

  handleSubmit(req, res, query) {
    const { key, method, googlekey, pageurl, json } = query;

    // Validate API key
    if (!key || key !== this.config.validApiKey) {
      return this.sendResponse(res, {
        status: 0,
        request: 'ERROR_WRONG_USER_KEY'
      }, json);
    }

    // Validate method
    if (method !== 'userrecaptcha') {
      return this.sendResponse(res, {
        status: 0,
        request: 'ERROR_WRONG_CAPTCHA_ID'
      }, json);
    }

    // Validate required parameters
    if (!googlekey || !pageurl) {
      return this.sendResponse(res, {
        status: 0,
        request: 'ERROR_CAPTCHA_UNSOLVABLE'
      }, json);
    }

    // Simulate failure based on failure rate
    if (Math.random() < this.config.failureRate) {
      this.stats.failed++;
      return this.sendResponse(res, {
        status: 0,
        request: 'ERROR_CAPTCHA_UNSOLVABLE'
      }, json);
    }

    // Create task
    const taskId = this.generateTaskId();
    const task = {
      id: taskId,
      method,
      googlekey,
      pageurl,
      submittedAt: Date.now(),
      solvedAt: null,
      solution: null,
      status: 'pending'
    };

    this.tasks.set(taskId, task);
    this.stats.submitted++;

    // Schedule solving
    setTimeout(() => {
      this.solveTask(taskId);
    }, this.config.solveDelay);

    // Return task ID
    return this.sendResponse(res, {
      status: 1,
      request: taskId
    }, json);
  }

  handleResult(req, res, query) {
    const { key, action, id, json } = query;

    // Validate API key
    if (!key || key !== this.config.validApiKey) {
      return this.sendResponse(res, {
        status: 0,
        request: 'ERROR_WRONG_USER_KEY'
      }, json);
    }

    // Validate action
    if (action !== 'get') {
      return this.sendResponse(res, {
        status: 0,
        request: 'ERROR_WRONG_ACTION'
      }, json);
    }

    // Validate task ID
    if (!id) {
      return this.sendResponse(res, {
        status: 0,
        request: 'ERROR_WRONG_ID_FORMAT'
      }, json);
    }

    const task = this.tasks.get(id);

    if (!task) {
      return this.sendResponse(res, {
        status: 0,
        request: 'ERROR_WRONG_CAPTCHA_ID'
      }, json);
    }

    this.stats.polled++;

    // Check if solved
    if (task.status === 'solved') {
      this.stats.solved++;
      return this.sendResponse(res, {
        status: 1,
        request: task.solution
      }, json);
    }

    // Still pending
    return this.sendResponse(res, {
      status: 0,
      request: 'CAPCHA_NOT_READY'
    }, json);
  }

  solveTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    // Generate mock reCAPTCHA token (similar format to real tokens)
    task.solution = this.generateMockToken();
    task.solvedAt = Date.now();
    task.status = 'solved';
    this.tasks.set(taskId, task);
  }

  generateTaskId() {
    return Math.floor(Math.random() * 9000000000) + 1000000000;
  }

  generateMockToken() {
    // Mock reCAPTCHA response token format
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let token = '03AHJ_Vuve'; // Common reCAPTCHA prefix
    for (let i = 0; i < 380; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  sendResponse(res, data, useJson) {
    if (useJson === '1') {
      // JSON response
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } else {
      // Text response (original format)
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      if (data.status === 1) {
        res.end(`OK|${data.request}`);
      } else {
        res.end(data.request);
      }
    }
  }

  reset() {
    this.tasks.clear();
    this.stats = {
      submitted: 0,
      solved: 0,
      failed: 0,
      polled: 0
    };
  }

  getStats() {
    return { ...this.stats };
  }

  setConfig(config) {
    this.config = { ...this.config, ...config };
  }
}

module.exports = Mock2CaptchaServer;

// CLI usage
if (require.main === module) {
  const server = new Mock2CaptchaServer({
    port: process.env.PORT || 3001,
    solveDelay: parseInt(process.env.SOLVE_DELAY) || 2000,
    validApiKey: process.env.API_KEY || 'test_api_key_123'
  });

  server.start().then(() => {
    console.log('Mock 2Captcha API server started');
    console.log(`Valid API key: ${server.config.validApiKey}`);
    console.log(`Solve delay: ${server.config.solveDelay}ms`);
    console.log('\nEndpoints:');
    console.log(`  http://localhost:${server.port}/in.php - Submit CAPTCHA`);
    console.log(`  http://localhost:${server.port}/res.php - Get result`);
    console.log(`  http://localhost:${server.port}/stats - Get stats (test helper)`);
    console.log(`  http://localhost:${server.port}/reset - Reset (test helper)`);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await server.stop();
    process.exit(0);
  });
}
