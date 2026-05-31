#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function usage() {
  console.log(`Usage:
  node tests/analyze_wled_snapshot.js --snapshot hardware-snapshots/gl-mc-003wl-before-ota
  node tests/analyze_wled_snapshot.js --snapshot hardware-snapshots/dev-board-before-tests --no-write
  node tests/analyze_wled_snapshot.js --dry-run

Options:
  --snapshot <dir>   Snapshot directory created by tests/wled_snapshot.js.
  --out <path>       Markdown report path. Defaults to <snapshot>/hardware-summary.md.
  --no-write         Print the report without writing it.
  --dry-run          Validate script arguments without reading a snapshot.
`);
}

function parseArgs(argv) {
  const options = {
    snapshotDir: '',
    outPath: '',
    write: true,
    dryRun: false
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    } else if (arg === '--snapshot') {
      options.snapshotDir = path.resolve(argv[++i] || '');
    } else if (arg === '--out') {
      options.outPath = path.resolve(argv[++i] || '');
    } else if (arg === '--no-write') {
      options.write = false;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.dryRun && !options.snapshotDir) {
    throw new Error('--snapshot is required unless --dry-run is set.');
  }

  if (options.snapshotDir && !options.outPath) {
    options.outPath = path.join(options.snapshotDir, 'hardware-summary.md');
  }

  return options;
}

function readJson(snapshotDir, fileName, required = true) {
  const filePath = path.join(snapshotDir, fileName);
  if (!fs.existsSync(filePath)) {
    if (required) throw new Error(`Missing ${filePath}`);
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function valueOrUnknown(value) {
  if (value === undefined || value === null || value === '') return 'unknown';
  return String(value);
}

function firstLedBus(cfg) {
  const buses = cfg && cfg.hw && cfg.hw.led && cfg.hw.led.ins;
  return Array.isArray(buses) && buses.length > 0 ? buses[0] : null;
}

function ledPins(bus) {
  if (!bus) return 'unknown';
  if (Array.isArray(bus.pin)) return bus.pin.join(', ');
  if (Array.isArray(bus.pins)) return bus.pins.join(', ');
  return valueOrUnknown(bus.pin);
}

function presetNames(presets) {
  return [1, 2, 3, 4, 5, 6, 7].map((id) => {
    const preset = presets && presets[String(id)];
    return `${id}: ${preset && preset.n ? preset.n : 'missing'}`;
  });
}

function buildReport(snapshotDir) {
  const manifest = readJson(snapshotDir, 'manifest.json', false) || {};
  const info = readJson(snapshotDir, 'info.json');
  const state = readJson(snapshotDir, 'state.json');
  const cfg = readJson(snapshotDir, 'cfg.json');
  const presets = readJson(snapshotDir, 'presets.json');
  const bus = firstLedBus(cfg);
  const snowlight = state && state.CBSnowlight;

  const lines = [
    '# WLED Hardware Snapshot Summary',
    '',
    `- Snapshot: ${snapshotDir}`,
    `- Host: ${valueOrUnknown(manifest.host)}`,
    `- Captured at: ${valueOrUnknown(manifest.capturedAt)}`,
    '',
    '## Device',
    '',
    `- WLED version: ${valueOrUnknown(info.ver)}`,
    `- Name: ${valueOrUnknown(info.name)}`,
    `- Brand/product: ${valueOrUnknown(info.brand)} / ${valueOrUnknown(info.product)}`,
    `- Chip family: ${valueOrUnknown(info.arch)}`,
    `- Flash size: ${valueOrUnknown(info.flash)} MB`,
    `- Free heap: ${valueOrUnknown(info.freeheap)} bytes`,
    `- Filesystem: ${valueOrUnknown(info.fs && info.fs.u)} KB used / ${valueOrUnknown(info.fs && info.fs.t)} KB total`,
    '',
    '## LED Configuration',
    '',
    `- LED count from info: ${valueOrUnknown(info.leds && info.leds.count)}`,
    `- Current draw now: ${valueOrUnknown(info.leds && info.leds.pwr)} mA`,
    `- Current limit: ${valueOrUnknown(info.leds && info.leds.maxpwr)} mA`,
    `- First bus start: ${valueOrUnknown(bus && bus.start)}`,
    `- First bus length: ${valueOrUnknown(bus && (bus.len || bus.length))}`,
    `- First bus GPIO: ${ledPins(bus)}`,
    `- First bus color order: ${valueOrUnknown(bus && bus.order)}`,
    `- First bus type: ${valueOrUnknown(bus && bus.type)}`,
    '',
    '## CB SnowLIGHT',
    '',
    `- CBSnowlight state present: ${snowlight ? 'yes' : 'no'}`,
    `- Mode: ${valueOrUnknown(snowlight && snowlight.mode)}`,
    `- Last error: ${valueOrUnknown(snowlight && snowlight.lastError)}`,
    `- Failures: ${valueOrUnknown(snowlight && snowlight.failures)}`,
    '',
    '## Presets',
    ''
  ];

  for (const presetLine of presetNames(presets)) {
    lines.push(`- ${presetLine}`);
  }

  lines.push(
    '',
    '## Safety Notes',
    '',
    '- Confirm UART recovery pads and boot mode before OTA flashing the GL-MC-003WL.',
    '- Compare flash size and filesystem layout with the latest firmware size check.',
    '- Treat missing CBSnowlight state as expected before custom firmware and as a failure after flashing.',
    '- This report summarizes JSON surfaces only; it does not prove physical LED wiring, diffuser appearance, or UART recovery.'
  );

  return `${lines.join('\n')}\n`;
}

function main() {
  const options = parseArgs(process.argv);

  if (options.dryRun) {
    console.log('WLED snapshot analysis dry run passed');
    return;
  }

  const report = buildReport(options.snapshotDir);

  if (options.write) {
    fs.writeFileSync(options.outPath, report);
    console.log(`WLED snapshot analysis saved to ${options.outPath}`);
  } else {
    process.stdout.write(report);
  }
}

try {
  main();
} catch (error) {
  console.error(`WLED snapshot analysis failed: ${error.message}`);
  process.exit(1);
}
