#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const defaultFirmwarePath = path.join(repoRoot, 'WLED', '.pio', 'build', 'cb_snowlight_nodemcuv2', 'firmware.bin');
const defaultMaxBytes = 1044464;
const defaultWarnPct = 94;

function usage() {
  console.log(`Usage:
  node tests/check_firmware_size.js
  node tests/check_firmware_size.js --firmware WLED/.pio/build/cb_snowlight_nodemcuv2/firmware.bin --max-bytes 1044464

Options:
  --firmware <path>   Firmware binary path. Defaults to the verified cb_snowlight_nodemcuv2 build output.
  --max-bytes <n>     Maximum upload size in bytes. Defaults to ${defaultMaxBytes}.
  --warn-pct <n>      Warning threshold percentage. Defaults to ${defaultWarnPct}.
`);
}

function parseArgs(argv) {
  const options = {
    firmware: defaultFirmwarePath,
    maxBytes: defaultMaxBytes,
    warnPct: defaultWarnPct
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    } else if (arg === '--firmware') {
      options.firmware = path.resolve(argv[++i] || '');
    } else if (arg === '--max-bytes') {
      options.maxBytes = Number(argv[++i]);
    } else if (arg === '--warn-pct') {
      options.warnPct = Number(argv[++i]);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isFinite(options.maxBytes) || options.maxBytes <= 0) {
    throw new Error('--max-bytes must be a positive number.');
  }

  if (!Number.isFinite(options.warnPct) || options.warnPct <= 0 || options.warnPct > 100) {
    throw new Error('--warn-pct must be a number from 1 through 100.');
  }

  return options;
}

function main() {
  const options = parseArgs(process.argv);
  const stats = fs.statSync(options.firmware);
  const usedPct = (stats.size / options.maxBytes) * 100;
  const freeBytes = options.maxBytes - stats.size;

  console.log(`Firmware: ${path.relative(repoRoot, options.firmware)}`);
  console.log(`Size: ${stats.size} bytes`);
  console.log(`Max upload: ${options.maxBytes} bytes`);
  console.log(`Used: ${usedPct.toFixed(1)}%`);
  console.log(`Remaining: ${freeBytes} bytes`);

  if (stats.size > options.maxBytes) {
    throw new Error('Firmware exceeds the configured maximum upload size.');
  }

  if (usedPct >= options.warnPct) {
    console.log(`Warning: firmware is at or above ${options.warnPct}% of the configured maximum upload size.`);
  }

  console.log('Firmware size check passed');
}

try {
  main();
} catch (error) {
  console.error(`Firmware size check failed: ${error.message}`);
  process.exit(1);
}
