#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'firmware/firmware.bin',
  'firmware/firmware-manifest.json',
  'config/presets.cb-snowlight.json',
  'config/usermod-config.cb-snowlight.json',
  'docs/HARDWARE_RUNBOOK.md',
  'docs/HARDWARE_SESSION_LOG_TEMPLATE.md',
  'docs/HARDWARE_SAFETY.md',
  'docs/END_TO_END_CHECKLIST.md',
  'docs/BUILD_VERIFICATION.md'
];

function usage() {
  console.log(`Usage:
  node tests/validate_hardware_bundle.js --bundle hardware-bundles/dev-board-001

Options:
  --bundle <dir>   Hardware artifact bundle directory.
`);
}

function parseArgs(argv) {
  const options = {
    bundleDir: ''
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    } else if (arg === '--bundle') {
      options.bundleDir = path.resolve(argv[++i] || '');
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.bundleDir) {
    throw new Error('--bundle is required.');
  }

  return options;
}

function sha256(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function main() {
  const options = parseArgs(process.argv);
  const manifestPath = path.join(options.bundleDir, 'bundle-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const entries = new Map((manifest.files || []).map((entry) => [entry.path, entry]));

  for (const requiredFile of requiredFiles) {
    if (!entries.has(requiredFile)) {
      throw new Error(`Bundle manifest is missing required file: ${requiredFile}`);
    }
  }

  for (const [relativePath, entry] of entries.entries()) {
    const filePath = path.join(options.bundleDir, relativePath);
    const stats = fs.statSync(filePath);
    if (stats.size !== entry.sizeBytes) {
      throw new Error(`Size mismatch for ${relativePath}: manifest ${entry.sizeBytes}, actual ${stats.size}`);
    }
    const actualHash = sha256(filePath);
    if (actualHash !== entry.sha256) {
      throw new Error(`SHA-256 mismatch for ${relativePath}: manifest ${entry.sha256}, actual ${actualHash}`);
    }
  }

  console.log('Hardware artifact bundle validation passed');
}

try {
  main();
} catch (error) {
  console.error(`Hardware artifact bundle validation failed: ${error.message}`);
  process.exit(1);
}
