# CB SnowLIGHT Hardware Runbook

Use this runbook at the bench. It assumes the local WLED build is already working and the first target is a recoverable ESP8266 dev board before any GL-MC-003WL OTA attempt.

## 1. Preflight

Run the full local verification suite:

```sh
node tests/run_local_checks.js
```

If local-listen permission is available, include mock WLED API checks:

```sh
node tests/run_local_checks.js --with-local-listen
```

Confirm the firmware binary size:

```sh
node tests/check_firmware_size.js
```

Write a firmware manifest with size and SHA-256:

```sh
node tests/write_firmware_manifest.js
node tests/validate_firmware_manifest.js
```

Optionally package all bench artifacts into one directory:

```sh
node tests/package_hardware_artifacts.js --out hardware-bundles/dev-board-001
node tests/validate_hardware_bundle.js --bundle hardware-bundles/dev-board-001
```

## 2. Start Evidence

Create a session log:

```sh
node tests/start_hardware_session.js --label dev-board-001
```

Fill in `hardware-snapshots/dev-board-001/SESSION.md` as each step completes.

## 3. Flash Dev Board

Build the firmware:

```sh
cd WLED
env PLATFORMIO_CORE_DIR=/Users/ericswanson/code/extensions-plugins/cb-snowlight-wled/WLED/.platformio-core uv run --with platformio==6.1.17 platformio run -e cb_snowlight_nodemcuv2
```

Flash by the safest available dev-board method, then complete normal WLED Wi-Fi setup.

Record the firmware manifest path and SHA-256 in `SESSION.md`.

## 4. Capture Baseline

Capture and summarize the board before configuration changes:

```sh
node tests/wled_snapshot.js --host http://<wled-ip> --out hardware-snapshots/dev-board-001/before-config
node tests/analyze_wled_snapshot.js --snapshot hardware-snapshots/dev-board-001/before-config
```

Record both paths in `SESSION.md`.

## 5. Configure CB SnowLIGHT

Import or copy `docs/presets.cb-snowlight.json` into WLED as `/presets.json`.

Apply the CB SnowLIGHT usermod fixture:

```sh
node tests/apply_wled_usermod_config.js --host http://<wled-ip>
```

If WLED has a settings PIN configured:

```sh
node tests/apply_wled_usermod_config.js --host http://<wled-ip> --pin <pin>
```

Capture and summarize the configured board:

```sh
node tests/wled_snapshot.js --host http://<wled-ip> --out hardware-snapshots/dev-board-001/after-config
node tests/analyze_wled_snapshot.js --snapshot hardware-snapshots/dev-board-001/after-config
```

## 6. Functional Verification

Run the API-visible smoke test:

```sh
node tests/wled_device_smoke_test.js --host http://<wled-ip>
```

Then manually verify and record in `SESSION.md`:

- Usermod Settings persistence after reboot.
- Manual presets apply visibly.
- `fetchNow` produces weather values or a clear error.
- API/Wi-Fi failure increments failures and reaches Offline mode.
- Recovery after API/Wi-Fi restore returns to weather-driven modes.
- Normal WLED controls work when `autoModeEnabled` is off.

## 7. Lighting Tuning

Tune presets through the actual LED count, diffuser, and printed terrain.

Back up final presets:

```sh
node tests/wled_snapshot.js --host http://<wled-ip> --out hardware-snapshots/dev-board-001/final
node tests/analyze_wled_snapshot.js --snapshot hardware-snapshots/dev-board-001/final
```

Record the final `/presets.json` backup path and visual notes in `SESSION.md`.

## 8. Validate Session Evidence

After the session is filled in:

```sh
node tests/validate_hardware_session.js --session hardware-snapshots/dev-board-001/SESSION.md --strict
```

Do not treat the dev-board milestone as complete until strict validation passes.

## 9. GL-MC-003WL Gate

Before OTA on the GL-MC-003WL:

1. Start a separate session:

   ```sh
   node tests/start_hardware_session.js --label gl-mc-003wl-before-ota
   ```

2. Capture the existing device:

   ```sh
   node tests/wled_snapshot.js --host http://<gl-mc-003wl-ip> --out hardware-snapshots/gl-mc-003wl-before-ota/before-ota
   node tests/analyze_wled_snapshot.js --snapshot hardware-snapshots/gl-mc-003wl-before-ota/before-ota
   ```

3. Confirm UART recovery, bootloader mode, 3.3 V serial, and full flash/config backup.
4. Compare snapshot facts and firmware size against `docs/HARDWARE_SAFETY.md`.
5. Only proceed if the session log says the safe-to-flash decision is yes and why.
