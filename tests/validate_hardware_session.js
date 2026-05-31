#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const defaultSessionPath = path.join(repoRoot, 'docs', 'HARDWARE_SESSION_LOG_TEMPLATE.md');

const requiredSections = [
  'Session',
  'Pre-Flash Safety',
  'Flash',
  'Configure',
  'Functional Verification',
  'Lighting Verification',
  'Decision'
];

const requiredFields = [
  'Date',
  'Operator',
  'Device',
  'Device role',
  'WLED host',
  'Firmware binary',
  'Firmware build command',
  'WLED commit',
  'PlatformIO environment',
  'Recovery method confirmed',
  'UART pads identified',
  'Bootloader/flash mode confirmed',
  'Serial voltage confirmed 3.3 V',
  'Original config snapshot path',
  'Firmware size check output',
  'Safe to flash decision',
  'Flash method',
  'Flash command or UI path',
  'Result',
  'WLED reachable after flash',
  'LED GPIO',
  'LED count',
  'Color order',
  'Current limit',
  'Preset import path',
  'Usermod config command',
  'Post-config snapshot path',
  'Snapshot summary path',
  '`CBSnowlight` appears in `/json/state`',
  '`CBSnowlight` appears in Usermod Settings',
  'Settings save/reboot/persist',
  'Smoke test command',
  'Smoke test result',
  '`fetchNow` result',
  'Weather values visible',
  'Offline mode after failure threshold',
  'Recovery after reconnect/API restore',
  'Powder visual result',
  'Storm visual result',
  'Bluebird visual result',
  'Alpenglow visual result',
  'Night visual result',
  'Offline visual result',
  'Demo visual result',
  'Final `/presets.json` backup path',
  'GL-MC-003WL V1 target decision',
  'Ship candidate decision',
  'Required follow-up',
  'Open risks'
];

function usage() {
  console.log(`Usage:
  node tests/validate_hardware_session.js
  node tests/validate_hardware_session.js --session hardware-snapshots/dev-board-001/SESSION.md --strict

Options:
  --session <path>   Session markdown file. Defaults to docs/HARDWARE_SESSION_LOG_TEMPLATE.md.
  --strict           Require required fields to have non-empty values.
`);
}

function parseArgs(argv) {
  const options = {
    sessionPath: defaultSessionPath,
    strict: false
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    } else if (arg === '--session') {
      options.sessionPath = path.resolve(argv[++i] || '');
    } else if (arg === '--strict') {
      options.strict = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function fieldPattern(field) {
  return new RegExp(`^- ${escapeRegExp(field)}:\\s*(.*)$`, 'm');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function main() {
  const options = parseArgs(process.argv);
  const markdown = fs.readFileSync(options.sessionPath, 'utf8');

  for (const section of requiredSections) {
    if (!markdown.includes(`## ${section}`)) {
      throw new Error(`Missing required section: ${section}`);
    }
  }

  const emptyFields = [];
  for (const field of requiredFields) {
    const match = markdown.match(fieldPattern(field));
    if (!match) {
      throw new Error(`Missing required field: ${field}`);
    }
    if (options.strict && match[1].trim() === '') {
      emptyFields.push(field);
    }
  }

  if (emptyFields.length > 0) {
    throw new Error(`Strict session validation found empty fields: ${emptyFields.join(', ')}`);
  }

  console.log(options.strict
    ? 'Hardware session strict validation passed'
    : 'Hardware session template validation passed');
}

try {
  main();
} catch (error) {
  console.error(`Hardware session validation failed: ${error.message}`);
  process.exit(1);
}
