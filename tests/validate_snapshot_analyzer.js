const { execFileSync } = require('child_process');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const analyzerPath = path.join(repoRoot, 'tests', 'analyze_wled_snapshot.js');
const fixturePath = path.join(repoRoot, 'tests', 'fixtures', 'wled-snapshot');

function assertIncludes(text, expected) {
  if (!text.includes(expected)) {
    throw new Error(`Expected analyzer output to include: ${expected}`);
  }
}

const output = execFileSync(
  process.execPath,
  [analyzerPath, '--snapshot', fixturePath, '--no-write'],
  { encoding: 'utf8' }
);

assertIncludes(output, '# WLED Hardware Snapshot Summary');
assertIncludes(output, '- WLED version: 0.17.0-dev');
assertIncludes(output, '- Chip family: esp8266');
assertIncludes(output, '- Flash size: 4 MB');
assertIncludes(output, '- LED count from info: 50');
assertIncludes(output, '- Current limit: 1500 mA');
assertIncludes(output, '- First bus GPIO: 2');
assertIncludes(output, '- CBSnowlight state present: yes');
assertIncludes(output, '- Mode: Bluebird');
assertIncludes(output, '- 7: CB Demo');

console.log('WLED snapshot analyzer validation passed');
