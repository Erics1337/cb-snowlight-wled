# CB SnowLIGHT Product Requirements

## 1. Product Summary

CB SnowLIGHT is a small illuminated 3D relief model of Crested Butte Mountain. It runs WLED with a custom usermod that checks weather and snow forecast data, then automatically switches WLED presets to reflect the mountain's current mood.

The product should feel like a tiny living snow report: useful at a glance, beautiful as a lamp, and personal to people who love Crested Butte.

## 2. Product Goals

- Create a plug-in desk/shelf object that glows based on Crested Butte snow and weather conditions.
- Use WLED for Wi-Fi setup, LED configuration, presets, UI, OTA, and effects.
- Add CB SnowLIGHT intelligence through a WLED usermod instead of replacing WLED.
- Support a low-cost first target: Gledopto GL-MC-003WL ESP8266 WLED controller.
- Keep the firmware lean enough for ESP8266, while leaving room for an ESP32 version later.
- Make the physical product simple to assemble and repeat.

## 3. Target Customer

Primary buyers:

- Crested Butte skiers and snowboarders
- locals, former locals, and second-home owners
- people who want cabin decor or a ski-trip keepsake
- gift buyers looking for a place-specific object

Customer motivation:

- "I want a little piece of Crested Butte on my desk."
- "I want to know when it is snowing without opening an app."
- "I want something prettier than a weather widget."

## 4. Core User Experience

First-time setup:

1. User plugs CB SnowLIGHT into USB power.
2. WLED starts its setup access point if Wi-Fi is not configured.
3. User connects to the WLED setup network.
4. User enters home Wi-Fi credentials through the standard WLED captive portal.
5. User optionally configures CB SnowLIGHT settings in WLED's Usermods page.
6. Device fetches weather data and switches to the appropriate preset.

Daily use:

- Device periodically fetches weather/snow data.
- User sees the mountain glow in a mode that matches conditions.
- User can still use normal WLED controls/presets if desired.
- If weather fetch fails, device falls back to a pretty offline preset.

## 5. Lighting Modes

V1 modes should be preset-driven. The usermod decides which preset to apply; WLED owns the actual colors and effects.

Recommended presets:

- Powder: cool white/blue shimmer, higher brightness
- Storm: blue-purple slow pulse
- Bluebird: crisp pale blue and white
- Alpenglow: pink/orange warm sweep
- Night: dim blue or warm nightlight
- Offline: gentle amber breathing or soft white
- Demo: cycles through all modes for sales/display

## 6. Weather Logic

Preferred API for V1:

- Open-Meteo forecast API
- No API key for basic usage
- JSON response
- Forecast variables to evaluate:
  - snowfall
  - snow depth if useful
  - cloud cover
  - wind gusts
  - temperature
  - time of day

Default location:

- Crested Butte Mountain summit area
- Latitude: 38.8833
- Longitude: -106.9436

V1 decision rules:

- Powder if recent/forecast snowfall exceeds a configurable threshold.
- Storm if snowfall is moderate, cloud cover is high, or wind gusts are high.
- Bluebird if little/no snowfall and low cloud cover during daytime.
- Alpenglow near sunrise/sunset if not storming.
- Night after local evening cutoff.
- Offline if API fetch fails repeatedly.

The first version should be easy to tune rather than over-smart.

## 7. WLED Usermod Requirements

The usermod should:

- compile as a standalone WLED usermod library
- self-register using WLED's current usermod mechanism
- expose persistent settings in WLED Usermods config
- fetch weather on an interval
- avoid blocking WLED's main loop for long periods
- store last successful weather mode
- activate WLED presets by preset ID
- gracefully handle Wi-Fi disconnects, DNS failures, HTTP failures, and malformed JSON

Config fields:

- enabled
- latitude
- longitude
- update interval minutes
- powder snowfall threshold
- storm snowfall threshold
- storm wind threshold
- cloud threshold
- powder preset ID
- storm preset ID
- bluebird preset ID
- alpenglow preset ID
- night preset ID
- offline preset ID
- demo preset ID
- auto mode enabled

## 8. Hardware V1

Initial target:

- Gledopto GL-MC-003WL
- ESP8266
- WLED preinstalled
- 5V USB power
- LED data likely on GPIO2, based on available docs

Known risks:

- USB may be power-only, not programming.
- OTA flashing custom WLED builds can soft-brick the device if firmware/layout is wrong.
- Physical UART recovery path should be identified before risky OTA work.
- ESP8266 memory is limited for HTTPS and JSON.

Preferred development safety:

1. Develop and test on a flashable dev board first if possible.
2. Confirm custom WLED build size for ESP8266.
3. Confirm GL-MC-003WL flash size and WLED version from the WLED info page.
4. Locate UART pads before replacing stock firmware.
5. Only OTA-flash the Gledopto after recovery is understood.

## 9. Hardware V2 Candidates

If ESP8266 becomes too constrained, move to ESP32/ESP32-C3.

Candidate boards:

- Athom WLED Slim LED Strip Controller
- QuinLED Dig2Go
- ESP32-C3 SuperMini plus JST-SM pigtail and level shifter
- custom PCB later

Preferred product-grade features:

- USB-C power/programming
- 5V LED power path
- 5V level-shifted LED data
- onboard button
- 3-pin JST-SM or pluggable terminal output
- compact footprint inside printed base

## 10. Physical Product Requirements

Terrain:

- 3D-printed Crested Butte Mountain relief
- based on open elevation data
- focused on Crested Butte Mountain, not surrounding ranges
- irregular mountain footprint preferred over rectangular slab
- regular and gently dramatized relief versions available

Base:

- hides controller and LED wiring
- exposes USB power port
- allows service access
- supports diffuser material
- provides strain relief for LED/controller wiring

Lighting:

- 20-50 addressable LEDs for first version
- WS2812B for low-cost RGB
- SK6812 RGBW for premium lamp quality
- firmware brightness/current limits required

## 11. Non-Goals For V1

- No mobile app.
- No cloud account.
- No custom weather backend.
- No multiple mountain support in the first prototype.
- No complex trail/lift mapping yet.
- No full replacement of WLED.

## 12. Success Criteria

Prototype success:

- Custom WLED build includes CB SnowLIGHT usermod.
- Device connects to Wi-Fi through normal WLED setup.
- Usermod fetches weather data.
- Usermod changes WLED preset based on weather mode.
- Device keeps working when API is unavailable.
- Lighting looks good in a printed terrain base.

Product success:

- User setup takes less than five minutes.
- No computer or script is required after flashing.
- The object is visually appealing even in offline mode.
- Assembly can be repeated without fragile wiring.
- Firmware can be updated or recovered safely.

## 13. Build Plan

Phase 1: Repository setup

- Clone official WLED usermod example.
- Rename template to CB SnowLIGHT.
- Add PRD, hardware notes, and development notes.

Phase 2: Minimal usermod

- Change library name.
- Rename class.
- Add config fields.
- Compile into WLED without weather logic.
- Confirm usermod appears in WLED settings.

Phase 3: Preset control

- Add logic to trigger a configured preset.
- Add demo mode.
- Confirm WLED preset switching works.

Phase 4: Weather fetch

- Add Open-Meteo request.
- Parse minimal JSON.
- Map weather to modes.
- Add retry/offline behavior.

Phase 5: GL-MC-003WL validation

- Record current WLED version and hardware info.
- Confirm flash size.
- Confirm LED GPIO.
- Identify recovery flashing method.
- Build firmware for ESP8266 target.

Phase 6: Product prototype

- Install board and LEDs into printed base.
- Tune presets.
- Test Wi-Fi setup and daily operation.
- Iterate on lighting and enclosure.

## 14. Open Questions

- Can the GL-MC-003WL be physically recovered via UART pads?
- What is the exact flash size and partition layout of the current controller?
- Is HTTPS/Open-Meteo reliable enough on ESP8266 inside WLED?
- Should the usermod fetch current weather, forecast, or both?
- What preset IDs should ship as defaults?
- Should the product use RGB or RGBW LEDs?
- How translucent should the printed mountain be?

