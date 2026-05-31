const { execFile } = require('child_process');
const http = require('http');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const applyConfigPath = path.join(repoRoot, 'tests', 'apply_wled_usermod_config.js');
let postedPayload = null;

const cfg = {
  um: {
    CBSnowlight: {}
  }
};

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
    if (request.method === 'GET' && request.url === '/json/cfg') {
      sendJson(response, 200, cfg);
      return;
    }

    if (request.method === 'POST' && request.url === '/json/cfg') {
      postedPayload = JSON.parse(await readBody(request));
      cfg.um.CBSnowlight = postedPayload.um && postedPayload.um.CBSnowlight
        ? { ...postedPayload.um.CBSnowlight }
        : {};
      sendJson(response, 200, { success: true });
      return;
    }

    sendJson(response, 404, { error: 'not found' });
  } catch (error) {
    sendJson(response, 500, { error: error.message });
  }
});

function runApplyConfig(port) {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [applyConfigPath, '--host', `http://127.0.0.1:${port}`, '--pin', '1234'],
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
    const stdout = await runApplyConfig(port);

    assert(stdout.includes('WLED usermod config apply passed'), 'Config helper did not report success.');
    assert(postedPayload, 'Config helper did not POST /json/cfg.');
    assert(postedPayload.sv === true, 'Config helper did not request save with sv:true.');
    assert(postedPayload.pin === '1234', 'Config helper did not include the supplied settings PIN.');
    assert(postedPayload.um && postedPayload.um.CBSnowlight, 'Config helper did not post um.CBSnowlight.');
    assert(postedPayload.um.CBSnowlight.enabled === true, 'Expected enabled=true in posted config.');
    assert(postedPayload.um.CBSnowlight.powderPresetId === 1, 'Expected powderPresetId=1 in posted config.');
    assert(postedPayload.um.CBSnowlight.demoPresetId === 7, 'Expected demoPresetId=7 in posted config.');

    console.log('WLED usermod config apply mock validation passed');
  } catch (error) {
    console.error(`WLED usermod config apply mock validation failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
