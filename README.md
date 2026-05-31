# CB SnowLIGHT WLED

CB SnowLIGHT is a WLED usermod project for a Crested Butte Mountain relief lamp that changes its lighting based on snow and weather conditions.

## Setup

Clone WLED alongside this repo (WLED is the build host; this repo is the usermod plugin):

```sh
git clone https://github.com/wled/WLED.git WLED
cd WLED && git checkout d884a3e && cd ..
cp docs/platformio_override.example.ini WLED/platformio_override.ini
```

## Folders

- `cb-snowlight-usermod/` - CB SnowLIGHT WLED usermod source
- `docs/PRD.md` - product requirements and build plan
- `docs/BUILD_PLAN.md` - milestone plan for turning the PRD into a working WLED usermod prototype
- `docs/platformio_override.example.ini` - local WLED build wiring example
- `docs/PRESETS.md` - first-pass preset ID map and visual targets
- `docs/presets.cb-snowlight.json` - importable first-pass WLED preset pack
- `docs/usermod-config.cb-snowlight.json` - matching first-pass CB SnowLIGHT usermod config fixture
- `docs/HARDWARE_SAFETY.md` - GL-MC-003WL flashing/recovery checklist
- `docs/HARDWARE_SESSION_LOG_TEMPLATE.md` - evidence template for dev-board and product-controller hardware runs
- `docs/HARDWARE_RUNBOOK.md` - linear bench procedure for flashing, configuring, testing, and recording hardware evidence
- `docs/END_TO_END_CHECKLIST.md` - prototype verification checklist
- `docs/BUILD_VERIFICATION.md` - latest local WLED compile result and firmware size
- `tests/` - host-side decision logic and artifact validation checks

## Current Direction

- Build as a WLED usermod, not standalone firmware.
- Use WLED for Wi-Fi setup, LED control, presets, OTA, and web UI.
- Use the CB SnowLIGHT usermod to fetch weather and activate presets.
- First hardware target: Gledopto GL-MC-003WL ESP8266 WLED controller.
- Safer later target: ESP32/ESP32-C3 controller with USB flashing and level-shifted LED output.

## Next Steps

1. Run `node tests/run_local_checks.js`.
2. Flash a recoverable dev board before touching GL-MC-003WL hardware.
3. Follow `docs/HARDWARE_RUNBOOK.md`.
4. Import the first-pass WLED preset pack and tune presets 1-7 from `docs/PRESETS.md`.
5. Run through `docs/END_TO_END_CHECKLIST.md`.
6. Validate the GL-MC-003WL recovery path before replacing stock firmware.

## Local Checks

Run the main local verification suite:

```sh
node tests/run_local_checks.js
```

Include mock WLED API tests that bind `127.0.0.1`:

```sh
node tests/run_local_checks.js --with-local-listen
```

Start a hardware evidence session:

```sh
node tests/start_hardware_session.js --label <session-label>
```

Validate the session template or a filled hardware session log:

```sh
node tests/validate_hardware_session.js
node tests/validate_hardware_session.js --session tests/fixtures/hardware-session/SESSION.md --strict
node tests/validate_hardware_session.js --session hardware-snapshots/<label>/SESSION.md --strict
```

Run the host-side decision logic test:

```sh
c++ -std=c++11 -Wall -Wextra -pedantic tests/cb_snowlight_logic_test.cpp -o /tmp/cb_snowlight_logic_test && /tmp/cb_snowlight_logic_test
```

Validate the WLED preset and usermod config fixtures:

```sh
node tests/validate_wled_artifacts.js
```

Check the latest local firmware binary size:

```sh
node tests/check_firmware_size.js
```

Validate the CB SnowLIGHT usermod config apply helper:

```sh
node tests/apply_wled_usermod_config.js --dry-run
```

Validate snapshot report generation:

```sh
node tests/validate_snapshot_analyzer.js
```

Validate the WLED smoke-test helper against a mock WLED API:

```sh
node tests/validate_wled_device_smoke_test.js
```

Validate the config apply helper against a mock WLED API:

```sh
node tests/validate_apply_wled_usermod_config.js
```

Once a flashed WLED device is on the network, run the API smoke test:

```sh
node tests/wled_device_smoke_test.js --host http://<wled-ip>
```

Apply the CB SnowLIGHT usermod config fixture to a flashed device:

```sh
node tests/apply_wled_usermod_config.js --host http://<wled-ip>
```

Capture a WLED JSON backup/snapshot before risky hardware changes:

```sh
node tests/wled_snapshot.js --host http://<wled-ip> --out hardware-snapshots/<label>
```

Summarize a captured snapshot:

```sh
node tests/analyze_wled_snapshot.js --snapshot hardware-snapshots/<label>
```

Build the WLED ESP8266 prototype firmware:

```sh
cd WLED
env PLATFORMIO_CORE_DIR="$(pwd)/.platformio-core" uv run --with platformio==6.1.17 platformio run -e cb_snowlight_nodemcuv2
```
