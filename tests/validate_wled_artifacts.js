const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const presetsPath = path.join(repoRoot, 'docs', 'presets.cb-snowlight.json');
const configPath = path.join(repoRoot, 'docs', 'usermod-config.cb-snowlight.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const presets = readJson(presetsPath);
const config = readJson(configPath);
const usermod = config.um && config.um.CBSnowlight;

const expectedPresets = [
  [1, 'Powder'],
  [2, 'Storm'],
  [3, 'Bluebird'],
  [4, 'Alpenglow'],
  [5, 'Night'],
  [6, 'Offline'],
  [7, 'Demo']
];

assert(presets['0'] && Object.keys(presets['0']).length === 0, 'Preset 0 must remain an empty default slot.');
assert(usermod, 'Config fixture must contain um.CBSnowlight.');

for (const [id, mode] of expectedPresets) {
  const preset = presets[String(id)];
  assert(preset, `Preset ${id} (${mode}) is missing.`);
  assert(typeof preset.n === 'string' && preset.n.includes(mode), `Preset ${id} name should include ${mode}.`);
}

for (const id of [1, 2, 3, 4, 5, 6]) {
  const segment = presets[String(id)].seg && presets[String(id)].seg[0];
  assert(segment, `Preset ${id} must include a first segment.`);
  assert(segment.start === 0, `Preset ${id} segment should start at LED 0.`);
  assert(segment.stop === 50, `Preset ${id} segment stop should stay at the documented first-pass LED count.`);
}

assert(Array.isArray(presets['7'].playlist.ps), 'Demo preset must include a playlist.');
assert(presets['7'].playlist.ps.join(',') === '1,2,3,4,5,6', 'Demo playlist must cycle presets 1 through 6.');

const presetFieldById = {
  1: 'powderPresetId',
  2: 'stormPresetId',
  3: 'bluebirdPresetId',
  4: 'alpenglowPresetId',
  5: 'nightPresetId',
  6: 'offlinePresetId',
  7: 'demoPresetId'
};

for (const [id, field] of Object.entries(presetFieldById)) {
  assert(usermod[field] === Number(id), `Config field ${field} must point to preset ${id}.`);
}

assert(usermod.enabled === true, 'Config fixture should enable the usermod.');
assert(usermod.autoModeEnabled === true, 'Config fixture should enable auto mode.');
assert(usermod.updateIntervalMinutes >= 5, 'Config fixture update interval must respect the firmware minimum.');
assert(usermod.minAutoModeDurationMinutes >= 0, 'Config fixture minimum mode duration must be non-negative.');
assert(usermod.minAutoModeDurationMinutes <= 120, 'Config fixture minimum mode duration must respect the firmware maximum.');
assert(usermod.offlineFailureThreshold >= 1, 'Config fixture should require at least one failure before Offline.');

console.log('WLED artifact validation passed');
