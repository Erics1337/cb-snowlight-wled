#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const defaultOutDir = path.join(repoRoot, 'hardware-bundles', new Date().toISOString().replace(/[:.]/g, '-'));
const firmwarePath = path.join(repoRoot, 'WLED', '.pio', 'build', 'cb_snowlight_nodemcuv2', 'firmware.bin');
const releaseFirmwarePath = path.join(repoRoot, 'WLED', 'build_output', 'release', 'WLED_17.0.0-dev_ESP8266.bin');
const releaseFirmwareGzPath = path.join(repoRoot, 'WLED', 'build_output', 'release', 'WLED_17.0.0-dev_ESP8266.bin.gz');

function usage() {
  console.log(`Usage:
  node tests/package_hardware_artifacts.js
  node tests/package_hardware_artifacts.js --out /tmp/cb-snowlight-hardware-bundle --force

Options:
  --out <dir>   Output bundle directory. Defaults to hardware-bundles/<timestamp>.
  --force       Allow writing into an existing directory.
`);
}

function parseArgs(argv) {
  const options = {
    outDir: defaultOutDir,
    force: false
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    } else if (arg === '--out') {
      options.outDir = path.resolve(argv[++i] || '');
    } else if (arg === '--force') {
      options.force = true;
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

function copyFile(source, outDir, relativeTarget) {
  const target = path.join(outDir, relativeTarget);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  return {
    path: relativeTarget,
    source: path.relative(repoRoot, source),
    sizeBytes: fs.statSync(target).size,
    sha256: sha256(target)
  };
}

function runNode(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    throw new Error(`${script} failed:\n${result.stdout}${result.stderr}`);
  }
}

function main() {
  const options = parseArgs(process.argv);

  if (fs.existsSync(options.outDir) && !options.force) {
    throw new Error(`${options.outDir} already exists. Use --force to overwrite files in it.`);
  }

  fs.mkdirSync(options.outDir, { recursive: true });

  const bundleManifest = {
    generatedAt: new Date().toISOString(),
    files: []
  };

  bundleManifest.files.push(copyFile(firmwarePath, options.outDir, 'firmware/firmware.bin'));

  if (fs.existsSync(releaseFirmwarePath)) {
    bundleManifest.files.push(copyFile(releaseFirmwarePath, options.outDir, 'firmware/WLED_17.0.0-dev_ESP8266.bin'));
  }

  if (fs.existsSync(releaseFirmwareGzPath)) {
    bundleManifest.files.push(copyFile(releaseFirmwareGzPath, options.outDir, 'firmware/WLED_17.0.0-dev_ESP8266.bin.gz'));
  }

  runNode('tests/write_firmware_manifest.js', [
    '--firmware',
    path.relative(repoRoot, firmwarePath),
    '--out',
    path.join(options.outDir, 'firmware', 'firmware-manifest.json')
  ]);
  runNode('tests/validate_firmware_manifest.js', [
    '--manifest',
    path.join(options.outDir, 'firmware', 'firmware-manifest.json')
  ]);
  bundleManifest.files.push({
    path: 'firmware/firmware-manifest.json',
    source: 'generated',
    sizeBytes: fs.statSync(path.join(options.outDir, 'firmware', 'firmware-manifest.json')).size,
    sha256: sha256(path.join(options.outDir, 'firmware', 'firmware-manifest.json'))
  });

  const filesToCopy = [
    ['docs/presets.cb-snowlight.json', 'config/presets.cb-snowlight.json'],
    ['docs/usermod-config.cb-snowlight.json', 'config/usermod-config.cb-snowlight.json'],
    ['docs/HARDWARE_RUNBOOK.md', 'docs/HARDWARE_RUNBOOK.md'],
    ['docs/HARDWARE_SESSION_LOG_TEMPLATE.md', 'docs/HARDWARE_SESSION_LOG_TEMPLATE.md'],
    ['docs/HARDWARE_SAFETY.md', 'docs/HARDWARE_SAFETY.md'],
    ['docs/END_TO_END_CHECKLIST.md', 'docs/END_TO_END_CHECKLIST.md'],
    ['docs/BUILD_VERIFICATION.md', 'docs/BUILD_VERIFICATION.md']
  ];

  for (const [source, target] of filesToCopy) {
    bundleManifest.files.push(copyFile(path.join(repoRoot, source), options.outDir, target));
  }

  fs.writeFileSync(
    path.join(options.outDir, 'bundle-manifest.json'),
    `${JSON.stringify(bundleManifest, null, 2)}\n`
  );

  console.log(`Hardware artifact bundle written: ${path.relative(repoRoot, options.outDir)}`);
}

try {
  main();
} catch (error) {
  console.error(`Hardware artifact packaging failed: ${error.message}`);
  process.exit(1);
}
