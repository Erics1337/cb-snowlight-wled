# CB SnowLIGHT Usermod

CB SnowLIGHT is a WLED usermod for a Crested Butte Mountain relief lamp. It fetches Open-Meteo weather data, chooses a mountain mood, and applies configured WLED preset IDs.

## Settings

The usermod stores its settings under `CBSnowlight` in WLED's Usermod Settings page.

Core settings:

- `enabled`
- `autoModeEnabled`
- `forceHttp`
- `demoMode`
- `latitude`
- `longitude`
- `updateIntervalMinutes`
- `minAutoModeDurationMinutes`
- `powderSnowfallThresholdMm`
- `stormSnowfallThresholdMm`
- `stormWindThresholdKmh`
- `cloudThresholdPct`
- `offlineFailureThreshold`
- `alpenglowMorningStartHour`
- `alpenglowMorningEndHour`
- `alpenglowEveningStartHour`
- `alpenglowEveningEndHour`

Preset settings:

- `powderPresetId`
- `stormPresetId`
- `bluebirdPresetId`
- `alpenglowPresetId`
- `nightPresetId`
- `offlinePresetId`
- `demoPresetId`

Default preset IDs are 1 through 7 in the same order.

Automatic weather-driven changes respect `minAutoModeDurationMinutes` to avoid twitchy mode changes. Manual JSON commands, Demo mode, and Offline mode bypass that hold.

## JSON State

The `/json/state` response includes a `CBSnowlight` object with the current mode, decision reason, last error, failure count, last successful fetch time, mode hold countdown, and the most recent weather values.

Manual commands can be posted to `/json/state`:

```json
{
  "CBSnowlight": {
    "mode": "powder"
  }
}
```

Valid mode values are `powder`, `storm`, `bluebird`, `alpenglow`, `night`, `offline`, and `demo`.

To force the next weather fetch:

```json
{
  "CBSnowlight": {
    "fetchNow": true
  }
}
```

After flashing hardware, the parent repo's `tests/wled_device_smoke_test.js` can verify that the usermod appears in `/json/state`, accepts manual mode commands, and accepts `fetchNow`.

## Build Into WLED

Add this library to a WLED `platformio_override.ini` via `custom_usermods`. The local repo includes the tested override shape in `../docs/platformio_override.example.ini`; the first verified build target is `cb_snowlight_nodemcuv2`.

```ini
[env:cb_snowlight_nodemcuv2]
extends = env:nodemcuv2
custom_usermods =
  ${env:nodemcuv2.custom_usermods}
  symlink:///absolute/path/to/cb-snowlight-wled/cb-snowlight-usermod
```

Use a recoverable development board before flashing a GL-MC-003WL.

## Logic Tests

The weather decision rules are shared between firmware and the host-side test in `../tests/cb_snowlight_logic_test.cpp`.
