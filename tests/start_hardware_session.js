#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const templatePath = path.join(repoRoot, 'docs', 'HARDWARE_SESSION_LOG_TEMPLATE.md');

function usage() {
  console.log(`Usage:
  node tests/start_hardware_session.js --label dev-board-001
  node tests/start_hardware_session.js --label gl-mc-003wl-before-ota --force

Options:
  --label <name>   Session directory name under hardware-snapshots/.
  --force          Overwrite an existing SESSION.md.
`);
}

function parseArgs(argv) {
  const options = {
    label: '',
    force: false,
    rootDir: path.join(repoRoot, 'hardware-snapshots')
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    } else if (arg === '--label') {
      options.label = argv[++i] || '';
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--root') {
      options.rootDir = path.resolve(argv[++i] || '');
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.label) {
    throw new Error('--label is required.');
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(options.label)) {
    throw new Error('--label may only contain letters, numbers, dot, underscore, and dash.');
  }

  return options;
}

function main() {
  const options = parseArgs(process.argv);
  const sessionDir = path.join(options.rootDir, options.label);
  const sessionPath = path.join(sessionDir, 'SESSION.md');

  fs.mkdirSync(sessionDir, { recursive: true });

  if (fs.existsSync(sessionPath) && !options.force) {
    throw new Error(`${path.relative(repoRoot, sessionPath)} already exists. Use --force to overwrite.`);
  }

  fs.copyFileSync(templatePath, sessionPath);

  console.log(`Hardware session started: ${path.relative(repoRoot, sessionPath)}`);
  console.log(`Next snapshot command: node tests/wled_snapshot.js --host http://<wled-ip> --out ${path.relative(repoRoot, sessionDir)}`);
}

try {
  main();
} catch (error) {
  console.error(`Hardware session bootstrap failed: ${error.message}`);
  process.exit(1);
}
