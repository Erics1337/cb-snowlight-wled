#include <cstdlib>
#include <iostream>
#include <string>

#include "../cb_snowlight_logic.h"

using CBSnowlightLogic::Decision;
using CBSnowlightLogic::DecisionConfig;
using CBSnowlightLogic::SnowMode;
using CBSnowlightLogic::WeatherSnapshot;

static int failures = 0;

static void expectEqual(const std::string& name, SnowMode actual, SnowMode expected) {
  if (actual != expected) {
    std::cerr << "FAIL " << name << ": expected "
              << CBSnowlightLogic::modeName(expected) << ", got "
              << CBSnowlightLogic::modeName(actual) << "\n";
    failures++;
  }
}

static void expectEqual(const std::string& name, int actual, int expected) {
  if (actual != expected) {
    std::cerr << "FAIL " << name << ": expected " << expected << ", got " << actual << "\n";
    failures++;
  }
}

static WeatherSnapshot clearDay(uint8_t hour = 12) {
  WeatherSnapshot weather;
  weather.valid = true;
  weather.isDay = true;
  weather.localHour = hour;
  weather.temperatureC = -4.0f;
  weather.cloudCoverPct = 10.0f;
  weather.windGustKmh = 12.0f;
  weather.snowfallMm = 0.0f;
  return weather;
}

static void expectMode(
  const std::string& name,
  const WeatherSnapshot& weather,
  const DecisionConfig& config,
  uint8_t failures,
  SnowMode expected
) {
  const Decision decision = CBSnowlightLogic::chooseMode(weather, config, failures);
  expectEqual(name, decision.mode, expected);
}

int main() {
  DecisionConfig config;

  expectEqual("parse ISO T hour", CBSnowlightLogic::parseLocalHour("2026-01-02T07:45"), 7);
  expectEqual("parse ISO space hour", CBSnowlightLogic::parseLocalHour("2026-01-02 18:00"), 18);
  expectEqual("reject missing hour", CBSnowlightLogic::parseLocalHour("2026-01-02"), -1);
  expectEqual("reject invalid hour", CBSnowlightLogic::parseLocalHour("2026-01-02T29:00"), -1);

  WeatherSnapshot weather = clearDay();
  expectMode("bluebird default clear day", weather, config, 0, CBSnowlightLogic::MODE_BLUEBIRD);

  weather = clearDay();
  weather.snowfallMm = 5.0f;
  expectMode("powder at threshold", weather, config, 0, CBSnowlightLogic::MODE_POWDER);

  weather = clearDay();
  weather.snowfallMm = 1.0f;
  expectMode("storm at snow threshold", weather, config, 0, CBSnowlightLogic::MODE_STORM);

  weather = clearDay();
  weather.cloudCoverPct = 75.0f;
  expectMode("storm at cloud threshold", weather, config, 0, CBSnowlightLogic::MODE_STORM);

  weather = clearDay();
  weather.windGustKmh = 45.0f;
  expectMode("storm at wind threshold", weather, config, 0, CBSnowlightLogic::MODE_STORM);

  weather = clearDay();
  weather.isDay = false;
  weather.localHour = 22;
  expectMode("night after calm weather", weather, config, 0, CBSnowlightLogic::MODE_NIGHT);

  weather = clearDay(7);
  expectMode("morning alpenglow", weather, config, 0, CBSnowlightLogic::MODE_ALPENGLOW);

  weather = clearDay(18);
  expectMode("evening alpenglow", weather, config, 0, CBSnowlightLogic::MODE_ALPENGLOW);

  weather = clearDay(7);
  weather.snowfallMm = 5.0f;
  expectMode("powder overrides alpenglow", weather, config, 0, CBSnowlightLogic::MODE_POWDER);

  weather = clearDay(22);
  weather.isDay = false;
  weather.windGustKmh = 45.0f;
  expectMode("storm overrides night", weather, config, 0, CBSnowlightLogic::MODE_STORM);

  weather = clearDay();
  weather.valid = false;
  expectMode("invalid weather is offline", weather, config, 0, CBSnowlightLogic::MODE_OFFLINE);

  weather = clearDay();
  expectMode("failure threshold is offline", weather, config, 3, CBSnowlightLogic::MODE_OFFLINE);

  config.demoMode = true;
  expectMode("demo overrides failures", weather, config, 3, CBSnowlightLogic::MODE_DEMO);

  if (failures != 0) {
    std::cerr << failures << " test failure(s)\n";
    return EXIT_FAILURE;
  }

  std::cout << "All CB SnowLIGHT decision logic tests passed\n";
  return EXIT_SUCCESS;
}
