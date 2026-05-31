#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const defaultFirmwarePath = path.join(repoRoot, 'WLED', '.pio', 'build', 'cb_snowlight_nodemcuv2', 'firmware.bin');
const defaultOutPath = path.join(repoRoot, 'WLED', '.pio', 'build', 'cb_snowlight_nodemcuv2', 'firmware-manifest.json');

function usage() {
  console.log(`Usage:
  node tests/write_firmware_manifest.js
  node tests/write_firmware_manifest.js --firmware WLED/.pio/build/cb_snowlight_nodemcuv2/firmware.bin --out /tmp/firmware-manifest.json

Options:
  --firmware <path>   Firmware binary path. Defaults to the verified cb_snowlight_nodemcuv2 build output.
  --out <path>        Manifest output path. Defaults next to firmware.bin.
  --no-write          Print manifest JSON without writing a file.
`);
}

function parseArgs(argv) {
  const options = {
    firmwarePath: defaultFirmwarePath,
    outPath: defaultOutPath,
    write: true
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    } else if (arg === '--firmware') {
      options.firmwarePath = path.resolve(argv[++i] || '');
    } else if (arg === '--out') {
      options.outPath = path.resolve(argv[++i] || '');
    } else if (arg === '--no-write') {
      options.write = false;
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

function buildManifest(firmwarePath) {
  const stats = fs.statSync(firmwarePath);
  return {
    firmware: path.relative(repoRoot, firmwarePath),
    sizeBytes: stats.size,
    sha256: sha256(firmwarePath),
    generatedAt: new Date().toISOString()
  };
}

function main() {
  const options = parseArgs(process.argv);
  const manifest = buildManifest(options.firmwarePath);
  const json = `${JSON.stringify(manifest, null, 2)}\n`;

  if (options.write) {
    fs.mkdirSync(path.dirname(options.outPath), { recursive: true });
    fs.writeFileSync(options.outPath, json);
    console.log(`Firmware manifest written: ${path.relative(repoRoot, options.outPath)}`);
  } else {
    process.stdout.write(json);
  }
}

try {
  main();
} catch (error) {
  console.error(`Firmware manifest failed: ${error.message}`);
  process.exit(1);
}
