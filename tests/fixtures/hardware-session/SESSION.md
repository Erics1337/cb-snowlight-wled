# CB SnowLIGHT Hardware Session Log

Copy this file into `hardware-snapshots/<session-label>/SESSION.md` for each dev-board or GL-MC-003WL hardware session. Keep command output, snapshot summaries, photos, and notes together so the build plan can be audited later.

## Session

- Date: 2026-05-30
- Operator: fixture
- Device: NodeMCU ESP8266 fixture
- Device role: dev board
- WLED host: http://example-wled.local
- Firmware binary: WLED/.pio/build/cb_snowlight_nodemcuv2/firmware.bin
- Firmware build command: env PLATFORMIO_CORE_DIR=... uv run --with platformio==6.1.17 platformio run -e cb_snowlight_nodemcuv2
- WLED commit: d884a3e
- PlatformIO environment: cb_snowlight_nodemcuv2

## Pre-Flash Safety

- Recovery method confirmed: USB serial recovery available
- UART pads identified: USB serial exposed by dev board
- Bootloader/flash mode confirmed: FLASH button pulls GPIO0 low
- Serial voltage confirmed 3.3 V: yes
- Original config snapshot path: hardware-snapshots/fixture-before/info.json
- Full flash backup path, if available: not applicable for fixture dev board
- Firmware size check output: Firmware size check passed
- Safe to flash decision: yes
- Reason: recoverable dev-board fixture

## Flash

- Flash method: USB serial
- Flash command or UI path: platformio upload fixture
- Result: success
- Reboot observed: yes
- WLED reachable after flash: yes
- Recovery action needed: none

## Configure

- LED GPIO: 2
- LED count: 50
- Color order: GRB
- Current limit: 1500 mA
- Preset import path: docs/presets.cb-snowlight.json
- Usermod config command: node tests/apply_wled_usermod_config.js --host http://example-wled.local
- Usermod config result: success
- Post-config snapshot path: hardware-snapshots/fixture-after
- Snapshot summary path: hardware-snapshots/fixture-after/hardware-summary.md

## Functional Verification

- `CBSnowlight` appears in `/json/state`: yes
- `CBSnowlight` appears in Usermod Settings: yes
- Settings save/reboot/persist: yes
- Smoke test command: node tests/wled_device_smoke_test.js --host http://example-wled.local
- Smoke test result: success
- Manual Powder preset result: success
- Manual Storm preset result: success
- Manual Bluebird preset result: success
- Manual Alpenglow preset result: success
- Manual Night preset result: success
- Manual Offline preset result: success
- Manual Demo preset result: success
- `fetchNow` result: success
- Weather values visible: yes
- Failure simulation method: API blocked in fixture notes
- Offline mode after failure threshold: yes
- Recovery after reconnect/API restore: yes
- Normal WLED controls work with `autoModeEnabled` off: yes
- Auto mode resumes after re-enable: yes

## Lighting Verification

- Powder visual result: acceptable fixture note
- Storm visual result: acceptable fixture note
- Bluebird visual result: acceptable fixture note
- Alpenglow visual result: acceptable fixture note
- Night visual result: acceptable fixture note
- Offline visual result: acceptable fixture note
- Demo visual result: acceptable fixture note
- Brightness comfortable: yes
- Current limit acceptable: yes
- Diffuser/terrain issues: none in fixture
- Preset changes made: none
- Final `/presets.json` backup path: hardware-snapshots/fixture-after/presets.json

## Decision

- GL-MC-003WL V1 target decision: undecided
- Ship candidate decision: no
- Required follow-up: run on real hardware
- Open risks: fixture only, not physical validation
