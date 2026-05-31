# CB SnowLIGHT Preset Pack

The usermod only chooses preset IDs. WLED owns the actual colors, effects, brightness, segments, and current limits.

## Default IDs

| ID | Mode | Intent |
| --- | --- | --- |
| 1 | Powder | Cool white and pale blue shimmer, brighter than normal |
| 2 | Storm | Blue-purple slow pulse with lower contrast |
| 3 | Bluebird | Crisp pale blue and clean white |
| 4 | Alpenglow | Pink-orange warm sweep |
| 5 | Night | Dim blue or warm nightlight |
| 6 | Offline | Gentle amber breathing or soft white |
| 7 | Demo | Sales/display cycle across the product moods |

## Importable First-Pass Presets

`docs/presets.cb-snowlight.json` is a reproducible first-pass `/presets.json` pack for IDs 1 through 7. It uses a 50 LED segment as a placeholder; adjust `seg[0].stop` to the physical LED count before final tuning if the product layout differs.

## Suggested First-Pass WLED Presets

These are the visual targets behind the preset pack. The final effect should still be tuned through the printed terrain, diffuser, LED count, and material color.

Powder:

- Brightness: medium-high, still under the configured current limit
- Palette: whites and icy blues
- Effect: shimmer, glitter, or slow sparkle

Storm:

- Brightness: medium-low
- Palette: deep blue, violet, cold white accents
- Effect: slow pulse, breathing, or cloud-like movement

Bluebird:

- Brightness: medium
- Palette: pale sky blue and white
- Effect: solid, gentle gradient, or very slow movement

Alpenglow:

- Brightness: medium
- Palette: rose, coral, amber, soft white
- Effect: slow sweep or gradient

Night:

- Brightness: low
- Palette: deep blue or warm white
- Effect: solid or very slow breathing

Offline:

- Brightness: low-medium
- Palette: amber or soft white
- Effect: gentle breathing

Demo:

- Use a WLED playlist if possible.
- Cycle presets 1 through 6 with enough time to see each mood.

## Setup Notes

- Set WLED LED count, GPIO, color order, and current limit before tuning presets.
- Import or copy `docs/presets.cb-snowlight.json` into WLED's `/presets.json` as the first pass.
- Use `docs/usermod-config.cb-snowlight.json` as the matching first-pass Usermod Settings fixture.
- Prefer presets that do not change segment bounds unless the physical layout requires it.
- Back up `/presets.json` after tuning.
- If default IDs change, update the CB SnowLIGHT Usermod Settings page to match.
