# CB SnowLIGHT Build Plan

This plan turns the PRD into a practical prototype path for the CB SnowLIGHT WLED usermod. The near-term goal is a safe, repeatable firmware prototype that can fetch Crested Butte weather data and drive WLED presets without replacing the rest of WLED.

## Guiding Principles

- Keep WLED in charge of Wi-Fi setup, LED control, presets, effects, OTA, and the web UI.
- Keep the CB SnowLIGHT usermod small, understandable, and tunable.
- Develop on recoverable hardware before risking the GL-MC-003WL.
- Use preset IDs for lighting behavior so visual tuning can happen in WLED.
- Prefer a working end-to-end loop before adding clever weather logic.

## Milestone 0: Development Baseline

Goal: make the repo ready for usermod development against a local WLED checkout.

Tasks:

- Decide where the local WLED checkout will live relative to this repo.
- Record the WLED version/branch we target first.
- Add a local `platformio_override.ini` example for including this usermod.
- Confirm the first dev board target, ideally an ESP8266 board that is easy to flash over USB.
- Confirm whether ESP8266 builds can use HTTP for Open-Meteo or whether HTTPS/TLS memory pressure forces a different approach.

Done when:

- A clean WLED build can include this repo as a custom usermod.
- We know the exact PlatformIO environment used for the first compile.

## Milestone 1: Rename And Compile Scaffold

Goal: convert the generic example into a CB SnowLIGHT usermod that compiles but does not yet fetch weather.

Tasks:

- Rename `usermod_example.cpp` to `cb_snowlight.cpp`.
- Rename `MyExampleUsermod` to `CBSnowlightUsermod`.
- Update `library.json` from `wled-usermod-example` to `cb-snowlight-usermod`.
- Remove example-only MQTT, button, sensor, and demo config fields unless needed later.
- Add basic runtime state fields:
  - current mode
  - last successful update time
  - last error string or code
  - consecutive failure count
- Add persistent config fields from the PRD with sensible defaults.
- Add Usermod Settings helper text for fields that need explanation.

Done when:

- The usermod appears in WLED Usermod Settings as `CBSnowlight`.
- Settings save and reload across reboot.
- The usermod exposes basic status in WLED info or JSON state.

## Milestone 2: Preset Switching Without Weather

Goal: prove the usermod can safely activate WLED presets.

Tasks:

- Add a small internal enum for modes:
  - `Powder`
  - `Storm`
  - `Bluebird`
  - `Alpenglow`
  - `Night`
  - `Offline`
  - `Demo`
- Map each mode to its configured preset ID.
- Add a manual/test mode setting or JSON state command for selecting a mode.
- Implement a guarded `applyMode()` function that avoids repeatedly reapplying the same preset.
- Decide how `auto mode enabled` interacts with manual WLED control.
- Add serial/debug logging behind a compile-time or runtime flag if useful.

Done when:

- Selecting a mode applies the expected WLED preset.
- Repeated loop calls do not spam preset application.
- Manual WLED controls remain usable when auto mode is disabled.

## Milestone 3: Weather Fetch Prototype

Goal: fetch Open-Meteo data on an interval without making WLED feel stuck.

Tasks:

- Build the Open-Meteo forecast URL from latitude, longitude, and requested variables.
- Start with the smallest useful JSON response:
  - snowfall
  - cloud cover
  - wind gusts
  - temperature
  - sunrise/sunset or enough time data to determine day/night
- Choose HTTP client strategy that fits ESP8266 memory limits.
- Add a timeout and failure handling for Wi-Fi disconnects, DNS failures, HTTP errors, and malformed JSON.
- Parse only the fields needed for V1 decisions.
- Store summary weather values in runtime state for debugging.

Done when:

- The usermod fetches real data from Open-Meteo.
- A failed fetch does not block WLED for an unacceptable time.
- Last successful data remains available after transient failures.

## Milestone 4: V1 Weather Decision Logic

Goal: convert weather data into stable, tunable lighting modes.

Tasks:

- Implement first-pass decision rules:
  - `Offline` after repeated fetch failures.
  - `Night` after local evening cutoff unless storm or powder should override.
  - `Alpenglow` near sunrise/sunset if not storming.
  - `Powder` when snowfall exceeds powder threshold.
  - `Storm` when snowfall, cloud cover, or wind exceeds storm thresholds.
  - `Bluebird` when daytime conditions are calm and clear.
- Make thresholds configurable.
- Add hysteresis or minimum mode duration if the lamp changes too often.
- Record why a mode was chosen, using a short status string or enum code.

Done when:

- Given known weather snapshots, the usermod chooses expected modes.
- Thresholds can be adjusted from WLED Usermod Settings.
- Offline behavior is graceful and visually intentional.

Verification added:

- `tests/cb_snowlight_logic_test.cpp` exercises the shared decision logic used by the firmware.

## Milestone 5: Hardware Safety Pass

Goal: avoid bricking the first product controller.

Tasks:

- Inspect GL-MC-003WL WLED info page:
  - chip type
  - flash size
  - WLED version
  - filesystem size
  - LED GPIO
- Identify UART pads and recovery procedure before custom OTA flashing.
- Confirm OTA image size leaves safe margin.
- Test the same or similar build on a disposable ESP8266 dev board.
- Document factory firmware backup steps if possible.

Done when:

- We have a written flash/recovery checklist.
- We have a successful custom WLED build on recoverable hardware.
- We know whether GL-MC-003WL remains the V1 target or should be replaced by ESP32/C3.

## Milestone 6: Lighting Preset Design

Goal: create the initial visual language of the lamp inside WLED.

Tasks:

- Create and save WLED presets for:
  - Powder
  - Storm
  - Bluebird
  - Alpenglow
  - Night
  - Offline
  - Demo
- Assign preset IDs to match the usermod defaults or update defaults to match the preset pack.
- Tune brightness and current limits for the physical LED count.
- Validate the effects through diffuser and terrain material, not only on a bare strip.

Done when:

- The lamp has a pleasing default look in every mode.
- Preset IDs are documented and reproducible.
- Offline mode still feels like a nice lamp.

## Milestone 7: End-To-End Prototype

Goal: assemble the first complete product loop.

Tasks:

- Flash custom WLED with CB SnowLIGHT usermod.
- Configure Wi-Fi through normal WLED setup.
- Configure LED count, GPIO, brightness, and current limit.
- Save the preset pack.
- Configure CB SnowLIGHT settings.
- Let the lamp run over multiple update intervals.
- Simulate API failures and Wi-Fi disconnects.

Done when:

- The lamp boots, connects, fetches weather, chooses a mode, and applies a preset.
- Normal WLED controls still work.
- The lamp recovers from network/API errors without manual intervention.

## Open Decisions

- Should V1 allow HTTP to Open-Meteo on ESP8266, or require HTTPS-capable hardware?
- Should storm/powder override night mode, or should night always win after a cutoff?
- Should auto mode resume after manual WLED control, and if so after how long?
- Should the lamp ship with a fixed Crested Butte location only, or expose location fields in V1?
- Is GL-MC-003WL worth the flashing risk, or should product V1 move to a safer ESP32/C3 controller?

## Immediate Next Work

1. Follow `docs/HARDWARE_RUNBOOK.md` to flash a recoverable ESP8266 dev board with the verified `cb_snowlight_nodemcuv2` firmware.
2. Import `docs/presets.cb-snowlight.json` and configure the usermod using `docs/usermod-config.cb-snowlight.json` or `node tests/apply_wled_usermod_config.js --host http://<wled-ip>` as the first-pass reference.
3. Start a hardware session log with `node tests/start_hardware_session.js --label <session-label>`, run `node tests/wled_device_smoke_test.js --host http://<wled-ip>`, and verify Usermod Settings persistence, manual mode preset switching, weather fetch, and offline fallback on hardware.
4. Collect GL-MC-003WL hardware facts from `docs/HARDWARE_SAFETY.md`, capture `node tests/wled_snapshot.js --host http://<gl-mc-003wl-ip> --out hardware-snapshots/gl-mc-003wl-before-ota`, and summarize it with `node tests/analyze_wled_snapshot.js --snapshot hardware-snapshots/gl-mc-003wl-before-ota` before attempting OTA on the product controller.
5. Tune presets 1-7 through the actual LED count, diffuser, and printed terrain.
6. Run the full prototype checklist in `docs/END_TO_END_CHECKLIST.md`.

## Current Status

- Milestone 0 is complete for local development: `WLED/` is checked out at commit `d884a3e`, `docs/platformio_override.example.ini` defines the build wiring, and `cb_snowlight_nodemcuv2` builds successfully.
- Milestone 1 is implemented in `cb-snowlight-usermod/cb_snowlight.cpp`: the usermod is renamed, config fields are present, example-only code is removed, and runtime status is exposed.
- Milestone 2 is implemented in code: manual JSON state mode selection maps modes to configured preset IDs and avoids repeatedly applying the same preset.
- Milestone 3 is implemented in code but not hardware-verified: Open-Meteo fetch support, timeouts, JSON parsing, failure handling, and weather status fields are present.
- Milestone 4 is implemented and host-tested as first-pass logic: powder, storm, alpenglow, night, bluebird, demo, and offline modes are selected from weather and configurable thresholds; automatic normal weather-mode changes now use a configurable minimum hold duration.
- Milestone 5 has a checklist in `docs/HARDWARE_SAFETY.md`, a bench runbook in `docs/HARDWARE_RUNBOOK.md`, a hardware evidence template in `docs/HARDWARE_SESSION_LOG_TEMPLATE.md`, a session bootstrap helper in `tests/start_hardware_session.js`, a session validator in `tests/validate_hardware_session.js` with a strict fixture at `tests/fixtures/hardware-session/SESSION.md`, a local firmware-size check in `tests/check_firmware_size.js`, a WLED JSON snapshot harness in `tests/wled_snapshot.js`, and a snapshot analyzer in `tests/analyze_wled_snapshot.js` covered by `tests/validate_snapshot_analyzer.js`; the ESP8266 firmware build uses 93.2% flash, so GL-MC-003WL flash layout and OTA margin still need to be collected from the physical device.
- Milestone 6 has a preset design guide in `docs/PRESETS.md`, an importable first-pass preset pack in `docs/presets.cb-snowlight.json`, and matching config in `docs/usermod-config.cb-snowlight.json`; presets still need to be tuned on actual LEDs and printed terrain.
- Milestone 7 has a verification checklist in `docs/END_TO_END_CHECKLIST.md`, a usermod config apply helper in `tests/apply_wled_usermod_config.js` covered by `tests/validate_apply_wled_usermod_config.js`, an API smoke-test harness in `tests/wled_device_smoke_test.js` covered by `tests/validate_wled_device_smoke_test.js`, and an aggregate local runner in `tests/run_local_checks.js`; firmware compilation is verified in `docs/BUILD_VERIFICATION.md`, but flashing, physical runtime validation, and diffuser tuning still require hardware.
