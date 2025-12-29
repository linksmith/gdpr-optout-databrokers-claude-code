/**
 * Unit Tests for Mock 2Captcha API Server
 *
 * Tests the mock server functionality without browser automation
 */

const assert = require('assert');
const fetch = require('node-fetch');
const Mock2CaptchaServer = require('../mocks/2captcha-mock-server');

describe('Mock 2Captcha API Server Unit Tests', function() {
  this.timeout(30000);

  let server;

  before(async function() {
    server = new Mock2CaptchaServer({
      port: 3002,
      solveDelay: 500,
      validApiKey: 'test_api_key_123'
    });
    await server.start();
  });

  after(async function() {
    if (server) {
      await server.stop();
    }
  });

  beforeEach(async function() {
    await fetch('http://localhost:3002/reset');
  });

  describe('Server Lifecycle', function() {
    it('should start and stop gracefully', async function() {
      const testServer = new Mock2CaptchaServer({ port: 3003 });
      await testServer.start();
      await testServer.stop();
    });
  });

  describe('Task Submission (/in.php)', function() {
    it('should accept valid CAPTCHA submission', async function() {
      const response = await fetch(
        'http://localhost:3002/in.php?key=test_api_key_123&method=userrecaptcha&googlekey=6LeTest&pageurl=http://example.com&json=1'
      );

      const data = await response.json();

      assert.strictEqual(data.status, 1, 'Should return success status');
      assert.ok(data.request, 'Should return task ID');
      assert.match(data.request, /^\d{10}$/, 'Task ID should be 10 digits');
    });

    it('should reject invalid API key', async function() {
      const response = await fetch(
        'http://localhost:3002/in.php?key=wrong_key&method=userrecaptcha&googlekey=6LeTest&pageurl=http://example.com&json=1'
      );

      const data = await response.json();

      assert.strictEqual(data.status, 0);
      assert.strictEqual(data.request, 'ERROR_WRONG_USER_KEY');
    });

    it('should reject invalid method', async function() {
      const response = await fetch(
        'http://localhost:3002/in.php?key=test_api_key_123&method=invalid&googlekey=6LeTest&pageurl=http://example.com&json=1'
      );

      const data = await response.json();

      assert.strictEqual(data.status, 0);
      assert.strictEqual(data.request, 'ERROR_WRONG_CAPTCHA_ID');
    });

    it('should reject missing required parameters', async function() {
      const response = await fetch(
        'http://localhost:3002/in.php?key=test_api_key_123&method=userrecaptcha&json=1'
      );

      const data = await response.json();

      assert.strictEqual(data.status, 0);
      assert.strictEqual(data.request, 'ERROR_CAPTCHA_UNSOLVABLE');
    });

    it('should support text response format (without json=1)', async function() {
      const response = await fetch(
        'http://localhost:3002/in.php?key=test_api_key_123&method=userrecaptcha&googlekey=6LeTest&pageurl=http://example.com'
      );

      const text = await response.text();

      assert.match(text, /^OK\|\d{10}$/, 'Should return OK|taskid format');
    });
  });

  describe('Result Retrieval (/res.php)', function() {
    it('should return CAPCHA_NOT_READY immediately after submission', async function() {
      // Submit task
      const submitResp = await fetch(
        'http://localhost:3002/in.php?key=test_api_key_123&method=userrecaptcha&googlekey=6LeTest&pageurl=http://example.com&json=1'
      );
      const submitData = await submitResp.json();
      const taskId = submitData.request;

      // Immediately query result
      const resultResp = await fetch(
        `http://localhost:3002/res.php?key=test_api_key_123&action=get&id=${taskId}&json=1`
      );
      const resultData = await resultResp.json();

      assert.strictEqual(resultData.status, 0);
      assert.strictEqual(resultData.request, 'CAPCHA_NOT_READY');
    });

    it('should return solution after solve delay', async function() {
      // Submit task
      const submitResp = await fetch(
        'http://localhost:3002/in.php?key=test_api_key_123&method=userrecaptcha&googlekey=6LeTest&pageurl=http://example.com&json=1'
      );
      const submitData = await submitResp.json();
      const taskId = submitData.request;

      // Wait for solving (500ms + margin)
      await new Promise(resolve => setTimeout(resolve, 700));

      // Query result
      const resultResp = await fetch(
        `http://localhost:3002/res.php?key=test_api_key_123&action=get&id=${taskId}&json=1`
      );
      const resultData = await resultResp.json();

      assert.strictEqual(resultData.status, 1, 'Should be solved');
      assert.ok(resultData.request, 'Should have solution token');
      assert.ok(resultData.request.startsWith('03AHJ_Vuve'), 'Should have reCAPTCHA token format');
      assert.ok(resultData.request.length > 100, 'Token should be long');
    });

    it('should reject invalid API key', async function() {
      const response = await fetch(
        'http://localhost:3002/res.php?key=wrong_key&action=get&id=1234567890&json=1'
      );

      const data = await response.json();

      assert.strictEqual(data.status, 0);
      assert.strictEqual(data.request, 'ERROR_WRONG_USER_KEY');
    });

    it('should reject invalid action', async function() {
      const response = await fetch(
        'http://localhost:3002/res.php?key=test_api_key_123&action=invalid&id=1234567890&json=1'
      );

      const data = await response.json();

      assert.strictEqual(data.status, 0);
      assert.strictEqual(data.request, 'ERROR_WRONG_ACTION');
    });

    it('should reject invalid task ID', async function() {
      const response = await fetch(
        'http://localhost:3002/res.php?key=test_api_key_123&action=get&id=9999999999&json=1'
      );

      const data = await response.json();

      assert.strictEqual(data.status, 0);
      assert.strictEqual(data.request, 'ERROR_WRONG_CAPTCHA_ID');
    });
  });

  describe('Statistics Tracking', function() {
    it('should track submitted tasks', async function() {
      // Submit 3 tasks
      for (let i = 0; i < 3; i++) {
        await fetch(
          `http://localhost:3002/in.php?key=test_api_key_123&method=userrecaptcha&googlekey=6LeTest${i}&pageurl=http://example.com`
        );
      }

      const statsResp = await fetch('http://localhost:3002/stats');
      const stats = await statsResp.json();

      assert.strictEqual(stats.submitted, 3);
    });

    it('should track polling requests', async function() {
      // Submit task
      const submitResp = await fetch(
        'http://localhost:3002/in.php?key=test_api_key_123&method=userrecaptcha&googlekey=6LeTest&pageurl=http://example.com&json=1'
      );
      const submitData = await submitResp.json();
      const taskId = submitData.request;

      // Poll 3 times
      for (let i = 0; i < 3; i++) {
        await fetch(
          `http://localhost:3002/res.php?key=test_api_key_123&action=get&id=${taskId}&json=1`
        );
      }

      const statsResp = await fetch('http://localhost:3002/stats');
      const stats = await statsResp.json();

      assert.ok(stats.polled >= 3);
    });

    it('should reset statistics', async function() {
      // Submit some tasks
      await fetch(
        'http://localhost:3002/in.php?key=test_api_key_123&method=userrecaptcha&googlekey=6LeTest&pageurl=http://example.com'
      );

      // Reset
      await fetch('http://localhost:3002/reset');

      // Check stats
      const statsResp = await fetch('http://localhost:3002/stats');
      const stats = await statsResp.json();

      assert.strictEqual(stats.submitted, 0);
      assert.strictEqual(stats.polled, 0);
    });
  });

  describe('Configuration', function() {
    it('should use custom solve delay', async function() {
      const fastServer = new Mock2CaptchaServer({
        port: 3004,
        solveDelay: 100
      });

      await fastServer.start();

      const submitResp = await fetch(
        'http://localhost:3004/in.php?key=test_api_key_123&method=userrecaptcha&googlekey=6LeTest&pageurl=http://example.com&json=1'
      );
      const submitData = await submitResp.json();
      const taskId = submitData.request;

      // Wait just over solve delay
      await new Promise(resolve => setTimeout(resolve, 150));

      const resultResp = await fetch(
        `http://localhost:3004/res.php?key=test_api_key_123&action=get&id=${taskId}&json=1`
      );
      const resultData = await resultResp.json();

      assert.strictEqual(resultData.status, 1, 'Should be solved after 100ms');

      await fastServer.stop();
    });
  });

  describe('Full Workflow', function() {
    it('should complete full submit-poll-solve cycle', async function() {
      // Step 1: Submit CAPTCHA
      const submitStart = Date.now();
      const submitResp = await fetch(
        'http://localhost:3002/in.php?key=test_api_key_123&method=userrecaptcha&googlekey=6LeIXX&pageurl=https://example.com/form&json=1'
      );
      const submitData = await submitResp.json();

      assert.strictEqual(submitData.status, 1);
      const taskId = submitData.request;

      // Step 2: Poll until ready (max 10 attempts)
      let solved = false;
      let solution = null;

      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));

        const resultResp = await fetch(
          `http://localhost:3002/res.php?key=test_api_key_123&action=get&id=${taskId}&json=1`
        );
        const resultData = await resultResp.json();

        if (resultData.status === 1) {
          solved = true;
          solution = resultData.request;
          break;
        }

        assert.strictEqual(resultData.request, 'CAPCHA_NOT_READY');
      }

      const totalTime = Date.now() - submitStart;

      // Step 3: Verify solution
      assert.ok(solved, 'Should be solved within 10 polls');
      assert.ok(solution, 'Should have solution');
      assert.ok(solution.startsWith('03AHJ_Vuve'), 'Should have correct token format');
      assert.ok(totalTime >= 500, 'Should take at least solve delay time');
      assert.ok(totalTime < 2000, 'Should solve within reasonable time');
    });
  });
});
