# GL-MC-003WL Hardware Safety Checklist

Do not OTA-flash the GL-MC-003WL with a custom build until the recovery path is known.

Use `docs/HARDWARE_RUNBOOK.md` for the ordered dev-board and GL-MC-003WL bench procedure.

Start a hardware session log before touching firmware:

```sh
node tests/start_hardware_session.js --label gl-mc-003wl-before-ota
```

## Record From The Existing WLED Info Page

- WLED version:
- Chip family:
- Flash size:
- Free heap:
- Filesystem size:
- LED GPIO:
- LED count:
- Color order:
- Current limit:
- OTA enabled:
- Original preset/config backup completed:

When the controller is reachable on Wi-Fi, capture a repeatable JSON snapshot before any custom OTA attempt:

```sh
node tests/wled_snapshot.js --host http://<gl-mc-003wl-ip> --out hardware-snapshots/gl-mc-003wl-before-ota
```

This saves `/json/info`, `/json/state`, `/json/cfg`, `/presets.json`, and a manifest. Keep this snapshot with the hardware notes for the unit.

Then summarize the captured hardware facts:

```sh
node tests/analyze_wled_snapshot.js --snapshot hardware-snapshots/gl-mc-003wl-before-ota
```

This writes `hardware-summary.md` into the snapshot directory with the WLED version, chip family, flash size, filesystem size, LED count, first LED GPIO, current limit, preset names, and whether `CBSnowlight` appears in `/json/state`.

## Recovery Checklist

- Locate UART pads for `3V3`, `GND`, `TX`, and `RX`.
- Confirm bootloader/flash mode button or pad sequence.
- Confirm whether USB is power-only or exposes data.
- Confirm required serial voltage is 3.3 V.
- Confirm a known-good firmware binary can be flashed from UART.
- Back up existing WLED config and presets from `/edit`.
- If possible, back up the full flash before replacing firmware.

## Firmware Safety Gates

- Build and flash the same custom WLED usermod on a disposable ESP8266 dev board first.
- Confirm binary size leaves OTA headroom for the GL-MC-003WL flash layout.
- Run `node tests/check_firmware_size.js` after each build and record the result.
- Confirm Wi-Fi setup, Usermod Settings, preset switching, and weather fetch all work on the dev board.
- Fill in the Pre-Flash Safety and Functional Verification sections of the hardware session log.
- Only then test OTA update on the GL-MC-003WL.

## Decision Point

Move V1 hardware to ESP32/ESP32-C3 if any of these remain true:

- HTTPS and JSON parsing are too large or unstable on ESP8266.
- OTA image size margin is poor.
- UART recovery is not practical for assembled units.
- USB is power-only and recovery requires fragile disassembly.
