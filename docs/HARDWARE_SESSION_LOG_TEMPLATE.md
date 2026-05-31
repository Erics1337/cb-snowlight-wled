# CB SnowLIGHT Hardware Session Log

Copy this file into `hardware-snapshots/<session-label>/SESSION.md` for each dev-board or GL-MC-003WL hardware session. Keep command output, snapshot summaries, photos, and notes together so the build plan can be audited later.

## Session

- Date:
- Operator:
- Device:
- Device role: dev board / GL-MC-003WL / other
- WLED host:
- Firmware binary:
- Firmware build command:
- Firmware manifest:
- WLED commit:
- PlatformIO environment:

## Pre-Flash Safety

- Recovery method confirmed:
- UART pads identified:
- Bootloader/flash mode confirmed:
- Serial voltage confirmed 3.3 V:
- Original config snapshot path:
- Full flash backup path, if available:
- Firmware size check output:
- Safe to flash decision:
- Reason:

## Flash

- Flash method: USB serial / OTA / other
- Flash command or UI path:
- Result:
- Reboot observed:
- WLED reachable after flash:
- Recovery action needed:

## Configure

- LED GPIO:
- LED count:
- Color order:
- Current limit:
- Preset import path:
- Usermod config command:
- Usermod config result:
- Post-config snapshot path:
- Snapshot summary path:

## Functional Verification

- `CBSnowlight` appears in `/json/state`:
- `CBSnowlight` appears in Usermod Settings:
- Settings save/reboot/persist:
- Smoke test command:
- Smoke test result:
- Manual Powder preset result:
- Manual Storm preset result:
- Manual Bluebird preset result:
- Manual Alpenglow preset result:
- Manual Night preset result:
- Manual Offline preset result:
- Manual Demo preset result:
- `fetchNow` result:
- Weather values visible:
- Failure simulation method:
- Offline mode after failure threshold:
- Recovery after reconnect/API restore:
- Normal WLED controls work with `autoModeEnabled` off:
- Auto mode resumes after re-enable:

## Lighting Verification

- Powder visual result:
- Storm visual result:
- Bluebird visual result:
- Alpenglow visual result:
- Night visual result:
- Offline visual result:
- Demo visual result:
- Brightness comfortable:
- Current limit acceptable:
- Diffuser/terrain issues:
- Preset changes made:
- Final `/presets.json` backup path:

## Decision

- GL-MC-003WL V1 target decision:
- Ship candidate decision:
- Required follow-up:
- Open risks:
