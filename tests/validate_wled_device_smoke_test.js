const { execFile } = require('child_process');
const http = require('http');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const smokeTestPath = path.join(repoRoot, 'tests', 'wled_device_smoke_test.js');
const expectedModes = ['powder', 'storm', 'bluebird', 'alpenglow', 'night', 'offline', 'demo'];
const postedModes = [];
let sawFetchNow = false;
let sawVerbosePost = false;

const state = {
  on: true,
  bri: 160,
  CBSnowlight: {
    mode: 'Unknown',
    reason: 'mock state',
    lastError: '',
    failures: 0,
    lastSuccessMs: 12345,
    modeHoldRemainingS: 0,
    snowfallMm: 0,
    cloudPct: 12,
    windGustKmh: 18,
    temperatureC: -3,
    localHour: 12,
    isDay: true
  }
};

function modeTitle(mode) {
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'content-type': 'application/json' });
  response.end(`${JSON.stringify(payload)}\n`);
}

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === 'GET' && request.url === '/json/info') {
      sendJson(response, 200, { ver: '0.17.0-dev', name: 'Mock WLED' });
      return;
    }

    if (request.method === 'GET' && request.url === '/json/state') {
      sendJson(response, 200, state);
      return;
    }

    if (request.method === 'POST' && request.url === '/json/state') {
      const body = JSON.parse(await readBody(request));
      if (body.v === true) sawVerbosePost = true;

      if (body.CBSnowlight && body.CBSnowlight.mode) {
        const mode = String(body.CBSnowlight.mode).toLowerCase();
        postedModes.push(mode);
        state.CBSnowlight.mode = modeTitle(mode);
      }

      if (body.CBSnowlight && body.CBSnowlight.fetchNow) {
        sawFetchNow = true;
        state.CBSnowlight.lastSuccessMs += 1000;
        sendJson(response, 200, { success: true });
        return;
      }

      sendJson(response, 200, state);
      return;
    }

    sendJson(response, 404, { error: 'not found' });
  } catch (error) {
    sendJson(response, 500, { error: error.message });
  }
});

function runSmokeTest(port) {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [smokeTestPath, '--host', `http://127.0.0.1:${port}`],
      { cwd: repoRoot },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`${error.message}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`));
          return;
        }
        resolve(stdout);
      }
    );
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

server.listen(0, '127.0.0.1', async () => {
  try {
    const { port } = server.address();
    const stdout = await runSmokeTest(port);

    assert(stdout.includes('WLED device smoke test passed'), 'Smoke test did not report success.');
    assert(sawVerbosePost, 'Smoke test did not send v:true in POST body.');
    assert(sawFetchNow, 'Smoke test did not POST fetchNow.');
    assert(postedModes.join(',') === expectedModes.join(','), `Unexpected posted modes: ${postedModes.join(',')}`);

    console.log('WLED device smoke test mock validation passed');
  } catch (error) {
    console.error(`WLED device smoke test mock validation failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
