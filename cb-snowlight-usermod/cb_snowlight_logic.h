#pragma once

#include <stdint.h>
#include <stddef.h>
#include <string.h>
#include <ctype.h>

namespace CBSnowlightLogic {

enum SnowMode : uint8_t {
  MODE_UNKNOWN = 0,
  MODE_POWDER,
  MODE_STORM,
  MODE_BLUEBIRD,
  MODE_ALPENGLOW,
  MODE_NIGHT,
  MODE_OFFLINE,
  MODE_DEMO
};

struct WeatherSnapshot {
  float snowfallMm = 0.0f;
  float cloudCoverPct = 0.0f;
  float windGustKmh = 0.0f;
  float temperatureC = 0.0f;
  int8_t localHour = -1;
  bool isDay = true;
  bool valid = false;
};

struct DecisionConfig {
  bool demoMode = false;
  float powderSnowfallThresholdMm = 5.0f;
  float stormSnowfallThresholdMm = 1.0f;
  float stormWindThresholdKmh = 45.0f;
  uint8_t cloudThresholdPct = 75;
  uint8_t offlineFailureThreshold = 3;
  uint8_t alpenglowMorningStartHour = 6;
  uint8_t alpenglowMorningEndHour = 8;
  uint8_t alpenglowEveningStartHour = 17;
  uint8_t alpenglowEveningEndHour = 19;
};

struct Decision {
  SnowMode mode = MODE_UNKNOWN;
  const char* reason = "waiting for weather";

  Decision() {}
  Decision(SnowMode selectedMode, const char* selectedReason)
    : mode(selectedMode), reason(selectedReason) {}
};

inline const char* modeName(SnowMode mode) {
  switch (mode) {
    case MODE_POWDER: return "Powder";
    case MODE_STORM: return "Storm";
    case MODE_BLUEBIRD: return "Bluebird";
    case MODE_ALPENGLOW: return "Alpenglow";
    case MODE_NIGHT: return "Night";
    case MODE_OFFLINE: return "Offline";
    case MODE_DEMO: return "Demo";
    default: return "Unknown";
  }
}

inline int8_t parseLocalHour(const char* isoTime) {
  if (!isoTime) return -1;

  const char* hourStart = strchr(isoTime, 'T');
  if (!hourStart || strlen(hourStart) < 3) hourStart = strchr(isoTime, ' ');
  if (!hourStart || strlen(hourStart) < 3) return -1;

  hourStart++;
  if (!isdigit((unsigned char)hourStart[0]) || !isdigit((unsigned char)hourStart[1])) return -1;

  const int8_t parsedHour = (hourStart[0] - '0') * 10 + (hourStart[1] - '0');
  return parsedHour >= 0 && parsedHour <= 23 ? parsedHour : -1;
}

inline bool isAlpenglowHour(const WeatherSnapshot& weather, const DecisionConfig& config) {
  if (weather.localHour < 0) return false;

  const uint8_t hour = (uint8_t)weather.localHour;
  const bool morning = hour >= config.alpenglowMorningStartHour && hour < config.alpenglowMorningEndHour;
  const bool evening = hour >= config.alpenglowEveningStartHour && hour < config.alpenglowEveningEndHour;
  return morning || evening;
}

inline Decision chooseMode(
  const WeatherSnapshot& weather,
  const DecisionConfig& config,
  uint8_t consecutiveFailures
) {
  if (config.demoMode) {
    return { MODE_DEMO, "demo mode enabled" };
  }

  if (consecutiveFailures >= config.offlineFailureThreshold) {
    return { MODE_OFFLINE, "weather fetch failures" };
  }

  if (!weather.valid) {
    return { MODE_OFFLINE, "waiting for valid weather" };
  }

  if (weather.snowfallMm >= config.powderSnowfallThresholdMm) {
    return { MODE_POWDER, "snowfall exceeds powder threshold" };
  }

  if (weather.snowfallMm >= config.stormSnowfallThresholdMm ||
      weather.windGustKmh >= config.stormWindThresholdKmh ||
      weather.cloudCoverPct >= config.cloudThresholdPct) {
    return { MODE_STORM, "storm threshold matched" };
  }

  if (!weather.isDay) {
    return { MODE_NIGHT, "nighttime" };
  }

  if (isAlpenglowHour(weather, config)) {
    return { MODE_ALPENGLOW, "alpenglow hour" };
  }

  return { MODE_BLUEBIRD, "clear daytime conditions" };
}

}
