# Build Verification

## Local WLED Checkout

- Checkout path: `WLED/`
- WLED commit: `d884a3e`
- Build environment: `cb_snowlight_nodemcuv2`
- PlatformIO: `6.1.17` via `uv run --with platformio==6.1.17`
- PlatformIO core dir: `WLED/.platformio-core`

## Local Verification Suite

Command:

```sh
node tests/run_local_checks.js
node tests/run_local_checks.js --with-local-listen
```

Result:

- Status: success
- Output: `All selected CB SnowLIGHT local checks passed`
- Coverage: artifact validation, snapshot analyzer fixture validation, firmware binary size and manifest generation, helper dry-runs, hardware session template validation, strict hardware session fixture validation, hardware session bootstrap under `/tmp`, host decision logic, and optional mock WLED API checks.
- Note: `--with-local-listen` binds local `127.0.0.1` test servers and may need permission in sandboxed environments.

## Hardware Session Bootstrap

Command:

```sh
node tests/start_hardware_session.js --label verification-smoke --root /tmp/cb-snowlight-session-test --force
```

Result:

- Status: success
- Output: `Hardware session started: ../../../../../tmp/cb-snowlight-session-test/verification-smoke/SESSION.md`
- Coverage: creates the session directory and copies `docs/HARDWARE_SESSION_LOG_TEMPLATE.md` without relying on manual file setup.

## Hardware Session Validation

Command:

```sh
node tests/validate_hardware_session.js
node tests/validate_hardware_session.js --session tests/fixtures/hardware-session/SESSION.md --strict
```

Result:

- Status: success
- Output: `Hardware session template validation passed`
- Output: `Hardware session strict validation passed`
- Coverage: required sections and required evidence fields in `docs/HARDWARE_SESSION_LOG_TEMPLATE.md`, plus strict non-empty evidence validation against `tests/fixtures/hardware-session/SESSION.md`.

## Host Decision Logic Test

Command:

```sh
c++ -std=c++11 -Wall -Wextra -pedantic tests/cb_snowlight_logic_test.cpp -o /tmp/cb_snowlight_logic_test && /tmp/cb_snowlight_logic_test
```

Result:

- Status: success
- Output: `All CB SnowLIGHT decision logic tests passed`
- Coverage: local hour parsing, bluebird, powder, storm, night, alpenglow, offline, demo, and mode priority order

## WLED Artifact Validation

Command:

```sh
node tests/validate_wled_artifacts.js
```

Result:

- Status: success
- Output: `WLED artifact validation passed`
- Coverage: preset IDs 1-7, demo playlist, first-pass segment bounds, Usermod Settings preset ID mapping, and minimum automatic mode duration bounds

## WLED Device Smoke Test Harness

Command:

```sh
node tests/wled_device_smoke_test.js --dry-run
node tests/validate_wled_device_smoke_test.js
```

Result:

- Status: success
- Output: `WLED device smoke test dry run passed`
- Output: `WLED device smoke test mock validation passed`
- Coverage: local script argument validation plus mock WLED API coverage for `/json/info`, `/json/state`, manual mode POSTs, `fetchNow`, verbose POST responses, and success-only POST fallback. Full device coverage requires a flashed WLED board reachable at `--host`.
- Note: manual mode and `fetchNow` POSTs include `v: true`, because WLED only returns full `/json/state` on POST when verbose response is requested.
- Note: the mock validation binds a local `127.0.0.1` HTTP server and may need local-listen permission in sandboxed environments.

## Firmware Size Check

Command:

```sh
node tests/check_firmware_size.js
```

Result:

- Status: success
- Output: `Firmware size check passed`
- Firmware binary: `WLED/.pio/build/cb_snowlight_nodemcuv2/firmware.bin`
- Binary size: 977,280 bytes
- Configured max upload size: 1,044,464 bytes
- Remaining: 67,184 bytes

## Firmware Manifest

Command:

```sh
node tests/write_firmware_manifest.js --out /tmp/cb-snowlight-local-checks/firmware-manifest.json
node tests/validate_firmware_manifest.js --manifest /tmp/cb-snowlight-local-checks/firmware-manifest.json
```

Result:

- Status: success
- Output: `Firmware manifest written: ../../../../../tmp/cb-snowlight-local-checks/firmware-manifest.json`
- Output: `Firmware manifest validation passed`
- Coverage: records firmware path, byte size, SHA-256, and generation time for hardware session evidence.
- SHA-256: `d9e2e34712748d33393f2e8695a9ccebff18eb8f736ee0d06eaabce9708812fa`

## Hardware Artifact Bundle

Command:

```sh
node tests/package_hardware_artifacts.js --out /tmp/cb-snowlight-local-checks/hardware-bundle --force
node tests/validate_hardware_bundle.js --bundle /tmp/cb-snowlight-local-checks/hardware-bundle
```

Result:

- Status: success
- Output: `Hardware artifact bundle written: ../../../../../tmp/cb-snowlight-local-checks/hardware-bundle`
- Output: `Hardware artifact bundle validation passed`
- Coverage: packages firmware binaries, generated firmware manifest, preset/config fixtures, hardware runbook, session template, safety checklist, end-to-end checklist, and build verification notes; validates required bundle files plus recorded byte sizes and SHA-256 values.

## WLED Snapshot Harness

Command:

```sh
node tests/wled_snapshot.js --dry-run
```

Result:

- Status: success
- Output: `WLED snapshot dry run passed`
- Coverage: local script argument validation only. Full snapshot capture requires a reachable WLED device.

## WLED Snapshot Analysis Harness

Command:

```sh
node tests/analyze_wled_snapshot.js --dry-run
node tests/validate_snapshot_analyzer.js
```

Result:

- Status: success
- Output: `WLED snapshot analysis dry run passed`
- Output: `WLED snapshot analyzer validation passed`
- Coverage: local script argument validation plus report generation from `tests/fixtures/wled-snapshot`. Full hardware analysis still requires a snapshot directory created from a reachable WLED device.

## WLED Usermod Config Apply Harness

Command:

```sh
node tests/apply_wled_usermod_config.js --dry-run
node tests/validate_apply_wled_usermod_config.js
```

Result:

- Status: success
- Output: `WLED usermod config apply dry run passed`
- Output: `WLED usermod config apply mock validation passed`
- Coverage: local fixture validation plus mock WLED API coverage for `/json/cfg` POST, `sv: true`, optional settings PIN, `um.CBSnowlight` payload, success response, and readback verification. Full config apply coverage requires a reachable WLED device.
- Note: the mock validation binds a local `127.0.0.1` HTTP server and may need local-listen permission in sandboxed environments.

## Latest Verified Build

Command:

```sh
env PLATFORMIO_CORE_DIR=/Users/ericswanson/code/extensions-plugins/cb-snowlight-wled/WLED/.platformio-core uv run --with platformio==6.1.17 platformio run -e cb_snowlight_nodemcuv2
```

Result:

- Status: success
- RAM: 46,960 bytes used of 81,920 bytes, 57.3%
- Flash: 973,123 bytes used of 1,044,464 bytes, 93.2%
- Firmware: `WLED/.pio/build/cb_snowlight_nodemcuv2/firmware.bin`
- Release copy: `WLED/build_output/release/WLED_17.0.0-dev_ESP8266.bin`
- Gzipped release copy: `WLED/build_output/release/WLED_17.0.0-dev_ESP8266.bin.gz`

WLED module validation:

- `2` optional/user module libraries included
- `2` usermod object entries found
- Code found in binary for `audioreactive` and `cb-snowlight-usermod`

## Notes

- The ESP8266 flash margin is narrow at 93.2%, so OTA safety still depends on the target controller's flash layout.
- The firmware binary itself is 977,280 bytes against the configured 1,044,464 byte upload maximum, leaving 67,184 bytes.
- The custom build disables Alexa, ESP-NOW, infrared, and MQTT for the prototype ESP8266 target.
- The WLED override uses `symlink://` for the CB SnowLIGHT usermod so local usermod edits are compiled directly instead of copied stale into `.pio/libdeps`.
- The first-pass preset pack and matching usermod config fixture are checked by `tests/validate_wled_artifacts.js`.
- Hardware flashing and runtime weather validation still require a recoverable dev board or the product controller.
