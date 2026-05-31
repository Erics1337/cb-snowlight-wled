#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const defaultManifestPath = path.join(repoRoot, 'WLED', '.pio', 'build', 'cb_snowlight_nodemcuv2', 'firmware-manifest.json');

function usage() {
  console.log(`Usage:
  node tests/validate_firmware_manifest.js --manifest WLED/.pio/build/cb_snowlight_nodemcuv2/firmware-manifest.json

Options:
  --manifest <path>   Manifest JSON path. Defaults next to the verified cb_snowlight_nodemcuv2 firmware.
`);
}

function parseArgs(argv) {
  const options = {
    manifestPath: defaultManifestPath
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    } else if (arg === '--manifest') {
      options.manifestPath = path.resolve(argv[++i] || '');
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
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
  const manifest = JSON.parse(fs.readFileSync(options.manifestPath, 'utf8'));

  if (!manifest.firmware || typeof manifest.firmware !== 'string') {
    throw new Error('Manifest must include firmware path.');
  }

  if (!Number.isInteger(manifest.sizeBytes) || manifest.sizeBytes <= 0) {
    throw new Error('Manifest must include positive sizeBytes.');
  }

  if (!/^[a-f0-9]{64}$/.test(manifest.sha256 || '')) {
    throw new Error('Manifest must include a lowercase SHA-256 hex digest.');
  }

  const firmwarePath = path.resolve(repoRoot, manifest.firmware);
  const stats = fs.statSync(firmwarePath);
  if (stats.size !== manifest.sizeBytes) {
    throw new Error(`Firmware size mismatch: manifest ${manifest.sizeBytes}, actual ${stats.size}.`);
  }

  const actualHash = sha256(firmwarePath);
  if (actualHash !== manifest.sha256) {
    throw new Error(`Firmware SHA-256 mismatch: manifest ${manifest.sha256}, actual ${actualHash}.`);
  }

  console.log('Firmware manifest validation passed');
}

try {
  main();
} catch (error) {
  console.error(`Firmware manifest validation failed: ${error.message}`);
  process.exit(1);
}
