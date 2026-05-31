#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function usage() {
  console.log(`Usage:
  node tests/wled_snapshot.js --host http://wled.local --out hardware-snapshots/gl-mc-003wl-before-ota
  node tests/wled_snapshot.js --host 192.168.1.50
  node tests/wled_snapshot.js --dry-run

Options:
  --host <url-or-ip>       WLED device URL or IP address.
  --out <dir>              Output directory. Defaults to hardware-snapshots/<timestamp>.
  --dry-run                Validate script arguments without contacting a device or writing files.
`);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function parseArgs(argv) {
  const options = {
    host: '',
    outDir: path.resolve(process.cwd(), 'hardware-snapshots', timestamp()),
    dryRun: false
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    } else if (arg === '--host') {
      options.host = argv[++i] || '';
    } else if (arg === '--out') {
      options.outDir = path.resolve(argv[++i] || '');
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

async function getText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`GET ${url} returned HTTP ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  const options = parseArgs(process.argv);

  if (options.dryRun) {
    console.log('WLED snapshot dry run passed');
    return;
  }

  fs.mkdirSync(options.outDir, { recursive: true });

  const endpoints = [
    ['info.json', '/json/info'],
    ['state.json', '/json/state'],
    ['cfg.json', '/json/cfg'],
    ['presets.json', '/presets.json']
  ];

  const manifest = {
    host: options.host,
    capturedAt: new Date().toISOString(),
    files: []
  };

  for (const [fileName, endpoint] of endpoints) {
    const text = await getText(`${options.host}${endpoint}`);
    const filePath = path.join(options.outDir, fileName);
    writeJson(filePath, JSON.parse(text));
    manifest.files.push({ fileName, endpoint });
  }

  writeJson(path.join(options.outDir, 'manifest.json'), manifest);
  console.log(`WLED snapshot saved to ${options.outDir}`);
}

main().catch((error) => {
  console.error(`WLED snapshot failed: ${error.message}`);
  process.exit(1);
});
