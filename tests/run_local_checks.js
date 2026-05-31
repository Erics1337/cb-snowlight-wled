#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

function usage() {
  console.log(`Usage:
  node tests/run_local_checks.js
  node tests/run_local_checks.js --with-local-listen

Options:
  --with-local-listen   Also run mock WLED API tests that bind 127.0.0.1.
`);
}

function parseArgs(argv) {
  const options = {
    withLocalListen: false
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    } else if (arg === '--with-local-listen') {
      options.withLocalListen = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function run(label, command, args) {
  console.log(`\n== ${label} ==`);
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'pipe'
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}`);
  }
}

function main() {
  const options = parseArgs(process.argv);

  const nodeChecks = [
    'tests/validate_wled_artifacts.js',
    'tests/validate_snapshot_analyzer.js',
    'tests/check_firmware_size.js',
    'tests/wled_device_smoke_test.js --dry-run',
    'tests/apply_wled_usermod_config.js --dry-run',
    'tests/wled_snapshot.js --dry-run',
    'tests/analyze_wled_snapshot.js --dry-run',
    'tests/validate_hardware_session.js',
    'tests/validate_hardware_session.js --session tests/fixtures/hardware-session/SESSION.md --strict',
    'tests/start_hardware_session.js --label verification-smoke --root /tmp/cb-snowlight-local-checks --force'
  ];

  for (const check of nodeChecks) {
    const [script, ...args] = check.split(' ');
    run(check, process.execPath, [script, ...args]);
  }

  run(
    'C++ decision logic test',
    'c++',
    [
      '-std=c++11',
      '-Wall',
      '-Wextra',
      '-pedantic',
      'tests/cb_snowlight_logic_test.cpp',
      '-o',
      '/tmp/cb_snowlight_logic_test'
    ]
  );
  run('Run C++ decision logic test', '/tmp/cb_snowlight_logic_test', []);

  if (options.withLocalListen) {
    run('tests/validate_wled_device_smoke_test.js', process.execPath, ['tests/validate_wled_device_smoke_test.js']);
    run('tests/validate_apply_wled_usermod_config.js', process.execPath, ['tests/validate_apply_wled_usermod_config.js']);
  } else {
    console.log('\nSkipped local-listen mock WLED API tests. Run with --with-local-listen to include them.');
  }

  console.log('\nAll selected CB SnowLIGHT local checks passed');
}

try {
  main();
} catch (error) {
  console.error(`\nLocal checks failed: ${error.message}`);
  process.exit(1);
}
