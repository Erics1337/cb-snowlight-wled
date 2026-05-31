#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const defaultConfigPath = path.join(repoRoot, 'docs', 'usermod-config.cb-snowlight.json');

function usage() {
  console.log(`Usage:
  node tests/apply_wled_usermod_config.js --host http://wled.local
  node tests/apply_wled_usermod_config.js --host 192.168.1.50 --pin 1234
  node tests/apply_wled_usermod_config.js --dry-run

Options:
  --host <url-or-ip>       WLED device URL or IP address.
  --config <path>          Usermod config fixture. Defaults to docs/usermod-config.cb-snowlight.json.
  --pin <pin>              WLED settings PIN, if configured.
  --dry-run                Validate the fixture without contacting a device.
`);
}

function parseArgs(argv) {
  const options = {
    host: '',
    configPath: defaultConfigPath,
    pin: '',
    dryRun: false
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    } else if (arg === '--host') {
      options.host = argv[++i] || '';
    } else if (arg === '--config') {
      options.configPath = path.resolve(argv[++i] || '');
    } else if (arg === '--pin') {
      options.pin = argv[++i] || '';
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
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

function readFixture(configPath) {
  const fixture = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const usermodConfig = fixture.um && fixture.um.CBSnowlight;

  if (!usermodConfig || typeof usermodConfig !== 'object' || Array.isArray(usermodConfig)) {
    throw new Error('Config fixture must contain um.CBSnowlight object.');
  }

  return usermodConfig;
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

function assertMatchingConfig(expected, actual) {
  for (const [key, value] of Object.entries(expected)) {
    if (actual[key] !== value) {
      throw new Error(`Config verification failed for ${key}: expected ${value}, got ${actual[key]}`);
    }
  }
}

async function main() {
  const options = parseArgs(process.argv);
  const usermodConfig = readFixture(options.configPath);

  if (options.dryRun) {
    console.log('WLED usermod config apply dry run passed');
    return;
  }

  const payload = {
    um: {
      CBSnowlight: usermodConfig
    },
    sv: true
  };

  if (options.pin) {
    payload.pin = options.pin;
  }

  const response = await requestJson(`${options.host}/json/cfg`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (response.success !== true) {
    throw new Error('WLED did not report success after /json/cfg POST.');
  }

  const config = await requestJson(`${options.host}/json/cfg`);
  const applied = config.um && config.um.CBSnowlight;
  if (!applied) {
    throw new Error('Could not verify um.CBSnowlight after applying config.');
  }

  assertMatchingConfig(usermodConfig, applied);
  console.log('WLED usermod config apply passed');
}

main().catch((error) => {
  console.error(`WLED usermod config apply failed: ${error.message}`);
  process.exit(1);
});
