# End-To-End Prototype Checklist

Use this checklist once a WLED checkout and recoverable hardware are available.

For a command-by-command bench flow, follow `docs/HARDWARE_RUNBOOK.md`.

Before starting, create a session log and fill it in as each step completes:

```sh
node tests/start_hardware_session.js --label <session-label>
```

## Build

- Clone or update WLED.
- Copy `docs/platformio_override.example.ini` into the WLED checkout as `platformio_override.ini`.
- Build `env:cb_snowlight_nodemcuv2` for the first recoverable ESP8266 prototype.
- Record WLED commit/version and PlatformIO environment.
- Record firmware binary size.
- Run `node tests/check_firmware_size.js`.

## Flash And Configure

- Flash a recoverable development board first.
- Complete normal WLED Wi-Fi setup.
- Capture a pre-test snapshot with `node tests/wled_snapshot.js --host http://<wled-ip> --out hardware-snapshots/dev-board-before-tests`.
- Summarize the snapshot with `node tests/analyze_wled_snapshot.js --snapshot hardware-snapshots/dev-board-before-tests`.
- Configure LED GPIO, LED count, color order, brightness, and current limit.
- Import or copy `docs/presets.cb-snowlight.json` into WLED as `/presets.json`.
- Adjust the preset segment stop values if the physical LED count is not 50.
- Configure CB SnowLIGHT Usermod Settings using `docs/usermod-config.cb-snowlight.json` as the first-pass reference.
- Or apply only the CB SnowLIGHT usermod config with `node tests/apply_wled_usermod_config.js --host http://<wled-ip>`.

## Functional Tests

- Confirm `CBSnowlight` appears in Usermod Settings.
- Save settings and reboot.
- Confirm settings persist.
- Run `node tests/wled_device_smoke_test.js --host http://<wled-ip>` from this repo once the device is reachable.
- POST manual mode commands to `/json/state` and confirm the expected preset applies.
- Trigger `fetchNow` and confirm `/json/state` shows current weather values.
- Disconnect Wi-Fi or block the API and confirm failures increment.
- Confirm Offline mode applies after the configured failure threshold.
- Reconnect Wi-Fi and confirm the lamp returns to weather-driven modes.

## Product Tests

- Run through at least three update intervals.
- Let normal WLED controls override the lamp with `autoModeEnabled` off.
- Re-enable auto mode and confirm weather control resumes.
- View every preset through the printed terrain and diffuser.
- Back up WLED config and `/presets.json`.
- Fill in the Lighting Verification and Decision sections of the hardware session log.

## Automated Smoke Test

The smoke test covers the API-visible parts of the prototype loop:

```sh
node tests/wled_device_smoke_test.js --host http://<wled-ip>
```

It verifies `/json/info`, confirms `CBSnowlight` is present in `/json/state`, posts each manual mode, triggers `fetchNow`, and checks key runtime fields. It does not prove LED visuals, Wi-Fi recovery, OTA safety, or diffuser tuning; keep the manual product tests above.

## Usermod Config Apply Utility

Apply and verify the CB SnowLIGHT usermod settings fixture without touching unrelated WLED config:

```sh
node tests/apply_wled_usermod_config.js --host http://<wled-ip>
```

If WLED has a settings PIN configured, add `--pin <pin>`. This posts only `um.CBSnowlight` plus `sv: true` to `/json/cfg`, then reads `/json/cfg` back and verifies each fixture value.

## Snapshot Utility

Capture the current WLED JSON surfaces before and after risky changes:

```sh
node tests/wled_snapshot.js --host http://<wled-ip> --out hardware-snapshots/<label>
```

This records `/json/info`, `/json/state`, `/json/cfg`, `/presets.json`, and a small manifest.

Summarize a snapshot into a hardware report:

```sh
node tests/analyze_wled_snapshot.js --snapshot hardware-snapshots/<label>
```

## Hardware Session Evidence

Use the session log template to keep the proof together:

```sh
node tests/start_hardware_session.js --label <label>
```

The active build plan should not be considered complete until the relevant `SESSION.md` records the dev-board flash, smoke test, failure/recovery behavior, and physical preset tuning.

Validate the filled session log before calling a hardware run complete:

```sh
node tests/validate_hardware_session.js --session hardware-snapshots/<label>/SESSION.md --strict
```
