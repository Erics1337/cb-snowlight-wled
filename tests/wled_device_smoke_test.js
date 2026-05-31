#!/usr/bin/env node

const modes = ['powder', 'storm', 'bluebird', 'alpenglow', 'night', 'offline', 'demo'];

function usage() {
  console.log(`Usage:
  node tests/wled_device_smoke_test.js --host http://wled.local
  node tests/wled_device_smoke_test.js --host 192.168.1.50
  node tests/wled_device_smoke_test.js --dry-run

Options:
  --host <url-or-ip>       WLED device URL or IP address.
  --mode <mode>            Manual mode to test first. Defaults to powder.
  --skip-manual-modes      Do not POST each manual mode.
  --skip-fetch             Do not POST fetchNow.
  --dry-run                Validate script arguments without contacting a device.
`);
}

function parseArgs(argv) {
  const options = {
    host: '',
    mode: 'powder',
    skipManualModes: false,
    skipFetch: false,
    dryRun: false
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    } else if (arg === '--host') {
      options.host = argv[++i] || '';
    } else if (arg === '--mode') {
      options.mode = (argv[++i] || '').toLowerCase();
    } else if (arg === '--skip-manual-modes') {
      options.skipManualModes = true;
    } else if (arg === '--skip-fetch') {
      options.skipFetch = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!modes.includes(options.mode)) {
    throw new Error(`--mode must be one of: ${modes.join(', ')}`);
  }

  if (!options.dryRun && !options.host) {
    throw new Error('--host is required unless --dry-run is set.');
  }

  if (options.host && !/^https?:\/\//i.test(options.host)) {
    options.host = `http://${options.host}`;
  }

  if (options.host) {
    options.host = options.host.replace(/\/+$/, '');
  }

  return options;
}

async function requestJson(url, requestOptions = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      ...requestOptions,
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        ...(requestOptions.headers || {})
      }
    });

    if (!response.ok) {
      throw new Error(`${requestOptions.method || 'GET'} ${url} returned HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function postState(host, payload) {
  return requestJson(`${host}/json/state`, {
    method: 'POST',
    body: JSON.stringify({ ...payload, v: true })
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function snowlightFromState(state) {
  return state && state.CBSnowlight;
}

async function postStateAndReadSnowlight(host, payload) {
  const response = await postState(host, payload);
  const fromResponse = snowlightFromState(response);
  if (fromResponse) return fromResponse;

  const state = await requestJson(`${host}/json/state`);
  return snowlightFromState(state);
}

async function main() {
  const options = parseArgs(process.argv);

  if (options.dryRun) {
    console.log('WLED device smoke test dry run passed');
    return;
  }

  console.log(`Checking ${options.host}`);

  const info = await requestJson(`${options.host}/json/info`);
  assert(info, 'Expected /json/info response.');
  assert(info.ver, 'Expected /json/info to include WLED version.');

  const initialState = await requestJson(`${options.host}/json/state`);
  let snowlight = snowlightFromState(initialState);
  assert(snowlight, 'Expected /json/state to include CBSnowlight. Is the custom firmware running?');

  console.log(`WLED ${info.ver}; CB SnowLIGHT mode: ${snowlight.mode || 'unknown'}`);

  if (!options.skipManualModes) {
    const modeOrder = [options.mode, ...modes.filter((mode) => mode !== options.mode)];
    for (const mode of modeOrder) {
      snowlight = await postStateAndReadSnowlight(options.host, { CBSnowlight: { mode } });
      assert(snowlight, `Expected CBSnowlight state after posting ${mode}.`);
      assert(
        typeof snowlight.mode === 'string' && snowlight.mode.toLowerCase() === mode,
        `Expected mode ${mode}, got ${snowlight.mode || 'missing'}.`
      );
      console.log(`Manual mode ${mode}: ok`);
    }
  }

  if (!options.skipFetch) {
    snowlight = await postStateAndReadSnowlight(options.host, { CBSnowlight: { fetchNow: true } });
    assert(snowlight, 'Expected CBSnowlight state after fetchNow.');
    console.log(`fetchNow accepted; failures=${snowlight.failures}, lastError=${snowlight.lastError || 'none'}`);
  }

  const finalState = await requestJson(`${options.host}/json/state`);
  snowlight = snowlightFromState(finalState);
  assert(snowlight, 'Expected final CBSnowlight state.');
  assert('failures' in snowlight, 'Expected failures field in CBSnowlight state.');
  assert('modeHoldRemainingS' in snowlight, 'Expected modeHoldRemainingS field in CBSnowlight state.');
  assert('snowfallMm' in snowlight, 'Expected snowfallMm field in CBSnowlight state.');

  console.log('WLED device smoke test passed');
}

main().catch((error) => {
  console.error(`WLED device smoke test failed: ${error.message}`);
  process.exit(1);
});
