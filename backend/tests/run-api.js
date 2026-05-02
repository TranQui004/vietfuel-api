/**
 * VietFuel API
 * Copyright (c) 2026 TranQui
 * Github: https://github.com/TranQui004
 * All rights reserved.
 * 
 * This source code is the intellectual property of TranQui.
 * Community contributions and pull requests are highly welcomed!
 */
'use strict';

const { spawn } = require('child_process');
const path = require('path');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

const apiModules = [
  './api/default-endpoint.smoke',
  './api/price-date.consistency',
  './api/all-sources.integrity',
];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isServerUp(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/api/health`, { headers: { Accept: 'application/json' } });
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForServer(baseUrl, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await isServerUp(baseUrl)) return true;
    await wait(1000);
  }
  return false;
}

async function main() {
  const backendDir = path.resolve(__dirname, '..');
  let serverProc = null;
  const results = [];

  const hasExternalServer = await isServerUp(API_BASE_URL);

  if (!hasExternalServer) {
    serverProc = spawn('node', ['index.js'], {
      cwd: backendDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, SKIP_BOOTSTRAP_JOBS: 'true' },
      shell: false,
    });

    serverProc.stdout.on('data', (buf) => process.stdout.write(`[server] ${buf}`));
    serverProc.stderr.on('data', (buf) => process.stderr.write(`[server] ${buf}`));

    const ready = await waitForServer(API_BASE_URL, 35000);
    if (!ready) {
      throw new Error(`Cannot start API server at ${API_BASE_URL} within timeout.`);
    }
  }

  try {
    for (const mod of apiModules) {
      const { run } = require(mod);
      const summary = await run(API_BASE_URL);
      results.push(summary);
      console.log(`[PASS] ${summary.name} (${summary.durationMs}ms)`);
    }

    console.log('');
    console.log('API test summary:');
    results.forEach((r, idx) => {
      console.log(`${idx + 1}. ${r.name}`);
    });
  } finally {
    if (serverProc && !serverProc.killed) {
      serverProc.kill('SIGTERM');
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`[FAIL] API test runner: ${err.message}`);
    process.exit(1);
  });

