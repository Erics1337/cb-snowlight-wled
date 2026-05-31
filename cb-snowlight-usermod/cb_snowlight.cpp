#include "wled.h"
#include "cb_snowlight_logic.h"

#ifdef ESP8266
  #include <ESP8266HTTPClient.h>
  #include <WiFiClientSecureBearSSL.h>
#else
  #include <HTTPClient.h>
  #include <WiFiClientSecure.h>
#endif

/*
 * CB SnowLIGHT
 *
 * A WLED usermod for a Crested Butte Mountain relief lamp. The usermod fetches
 * current conditions from Open-Meteo, classifies the mountain mood, and applies
 * WLED presets. WLED remains responsible for Wi-Fi setup, LED settings, effects,
 * presets, OTA, and the web UI.
 */
class CBSnowlightUsermod : public Usermod {
  private:
    using SnowMode = CBSnowlightLogic::SnowMode;
    using WeatherSnapshot = CBSnowlightLogic::WeatherSnapshot;

    bool enabled = true;
    bool autoModeEnabled = true;
    bool initDone = false;
    bool forceHttp = false;
    bool demoMode = false;

    float latitude = 38.8833f;
    float longitude = -106.9436f;
    uint16_t updateIntervalMinutes = 30;
    uint8_t minAutoModeDurationMinutes = 15;
    float powderSnowfallThresholdMm = 5.0f;
    float stormSnowfallThresholdMm = 1.0f;
    float stormWindThresholdKmh = 45.0f;
    uint8_t cloudThresholdPct = 75;
    uint8_t offlineFailureThreshold = 3;
    uint8_t alpenglowMorningStartHour = 6;
    uint8_t alpenglowMorningEndHour = 8;
    uint8_t alpenglowEveningStartHour = 17;
    uint8_t alpenglowEveningEndHour = 19;

    uint8_t powderPresetId = 1;
    uint8_t stormPresetId = 2;
    uint8_t bluebirdPresetId = 3;
    uint8_t alpenglowPresetId = 4;
    uint8_t nightPresetId = 5;
    uint8_t offlinePresetId = 6;
    uint8_t demoPresetId = 7;

    unsigned long lastFetchAttemptMs = 0;
    unsigned long lastFetchSuccessMs = 0;
    unsigned long lastPresetApplyMs = 0;
    uint8_t consecutiveFailures = 0;
    SnowMode currentMode = CBSnowlightLogic::MODE_UNKNOWN;
    SnowMode lastAppliedMode = CBSnowlightLogic::MODE_UNKNOWN;
    WeatherSnapshot weather;
    char lastError[48] = "";
    char decisionReason[64] = "waiting for weather";

    static const char _name[];
    static const char _enabled[];
    static const char _autoMode[];

    uint8_t presetForMode(SnowMode mode) const {
      switch (mode) {
        case CBSnowlightLogic::MODE_POWDER: return powderPresetId;
        case CBSnowlightLogic::MODE_STORM: return stormPresetId;
        case CBSnowlightLogic::MODE_BLUEBIRD: return bluebirdPresetId;
        case CBSnowlightLogic::MODE_ALPENGLOW: return alpenglowPresetId;
        case CBSnowlightLogic::MODE_NIGHT: return nightPresetId;
        case CBSnowlightLogic::MODE_OFFLINE: return offlinePresetId;
        case CBSnowlightLogic::MODE_DEMO: return demoPresetId;
        default: return 0;
      }
    }

    void setLastError(const char* message) {
      strlcpy(lastError, message, sizeof(lastError));
    }

    void setDecisionReason(const char* message) {
      strlcpy(decisionReason, message, sizeof(decisionReason));
    }

    void buildForecastUrl(char* url, size_t len) const {
      const char* scheme = forceHttp ? "http" : "https";
      snprintf_P(
        url,
        len,
        PSTR("%s://api.open-meteo.com/v1/forecast?latitude=%.4f&longitude=%.4f&current=temperature_2m,snowfall,cloud_cover,wind_gusts_10m,is_day&timezone=auto&forecast_days=1"),
        scheme,
        latitude,
        longitude
      );
    }

    bool fetchWeather() {
      if (!WLED_CONNECTED) {
        consecutiveFailures++;
        setLastError("WiFi disconnected");
        return false;
      }

      char url[256];
      buildForecastUrl(url, sizeof(url));

      HTTPClient http;
      int httpCode = 0;

      if (forceHttp) {
        WiFiClient client;
        if (!http.begin(client, url)) {
          consecutiveFailures++;
          setLastError("HTTP begin failed");
          return false;
        }
        http.setTimeout(3500);
        httpCode = http.GET();
      } else {
#ifdef ESP8266
        BearSSL::WiFiClientSecure client;
        client.setInsecure();
        if (!http.begin(client, url)) {
#else
        WiFiClientSecure client;
        client.setInsecure();
        if (!http.begin(client, url)) {
#endif
          consecutiveFailures++;
          setLastError("HTTPS begin failed");
          return false;
        }
        http.setTimeout(4500);
        httpCode = http.GET();
      }

      if (httpCode != HTTP_CODE_OK) {
        http.end();
        consecutiveFailures++;
        snprintf(lastError, sizeof(lastError), "HTTP %d", httpCode);
        return false;
      }

      DynamicJsonDocument doc(1536);
      DeserializationError error = deserializeJson(doc, http.getStream());
      http.end();

      if (error) {
        consecutiveFailures++;
        setLastError("JSON parse failed");
        return false;
      }

      JsonObject current = doc["current"];
      if (current.isNull()) {
        consecutiveFailures++;
        setLastError("missing current");
        return false;
      }

      weather.temperatureC = current["temperature_2m"] | 0.0f;
      weather.snowfallMm = current["snowfall"] | 0.0f;
      weather.cloudCoverPct = current["cloud_cover"] | 0.0f;
      weather.windGustKmh = current["wind_gusts_10m"] | 0.0f;
      weather.isDay = (current["is_day"] | 1) == 1;
      weather.localHour = CBSnowlightLogic::parseLocalHour(current["time"]);
      weather.valid = true;

      consecutiveFailures = 0;
      lastFetchSuccessMs = millis();
      setLastError("");
      return true;
    }

    SnowMode chooseMode() {
      CBSnowlightLogic::DecisionConfig config;
      config.demoMode = demoMode;
      config.powderSnowfallThresholdMm = powderSnowfallThresholdMm;
      config.stormSnowfallThresholdMm = stormSnowfallThresholdMm;
      config.stormWindThresholdKmh = stormWindThresholdKmh;
      config.cloudThresholdPct = cloudThresholdPct;
      config.offlineFailureThreshold = offlineFailureThreshold;
      config.alpenglowMorningStartHour = alpenglowMorningStartHour;
      config.alpenglowMorningEndHour = alpenglowMorningEndHour;
      config.alpenglowEveningStartHour = alpenglowEveningStartHour;
      config.alpenglowEveningEndHour = alpenglowEveningEndHour;

      const CBSnowlightLogic::Decision decision = CBSnowlightLogic::chooseMode(weather, config, consecutiveFailures);
      setDecisionReason(decision.reason);
      return decision.mode;
    }

    void applyMode(SnowMode mode, bool force = false) {
      const uint8_t presetId = presetForMode(mode);
      if (presetId == 0) return;
      if (!force && mode == lastAppliedMode) return;
      if (!force && millis() - lastPresetApplyMs < 1000) return;
      if (!force && !canAutoTransitionTo(mode)) return;

      applyPreset(presetId, CALL_MODE_DIRECT_CHANGE);
      currentMode = mode;
      lastAppliedMode = mode;
      lastPresetApplyMs = millis();
    }

    bool canAutoTransitionTo(SnowMode mode) {
      if (lastAppliedMode == CBSnowlightLogic::MODE_UNKNOWN || lastPresetApplyMs == 0) return true;
      if (mode == CBSnowlightLogic::MODE_OFFLINE || mode == CBSnowlightLogic::MODE_DEMO) return true;
      if (minAutoModeDurationMinutes == 0) return true;

      const unsigned long minDurationMs = (unsigned long)minAutoModeDurationMinutes * 60000UL;
      if (millis() - lastPresetApplyMs >= minDurationMs) return true;

      setDecisionReason("minimum mode duration active");
      return false;
    }

    uint16_t modeHoldRemainingSeconds() const {
      if (lastPresetApplyMs == 0 || minAutoModeDurationMinutes == 0) return 0;

      const unsigned long minDurationMs = (unsigned long)minAutoModeDurationMinutes * 60000UL;
      const unsigned long elapsedMs = millis() - lastPresetApplyMs;
      if (elapsedMs >= minDurationMs) return 0;

      return (uint16_t)((minDurationMs - elapsedMs + 999UL) / 1000UL);
    }

    void maybeUpdateWeather() {
      const unsigned long intervalMs = (unsigned long)updateIntervalMinutes * 60000UL;
      if (lastFetchAttemptMs != 0 && millis() - lastFetchAttemptMs < intervalMs) return;

      lastFetchAttemptMs = millis();
      fetchWeather();

      if (autoModeEnabled) {
        applyMode(chooseMode());
      }
    }

  public:
    void setup() override {
      initDone = true;
    }

    void connected() override {
      lastFetchAttemptMs = 0;
    }

    void loop() override {
      if (!enabled || !initDone || strip.isUpdating()) return;
      maybeUpdateWeather();
    }

    void addToJsonInfo(JsonObject& root) override {
      JsonObject user = root["u"];
      if (user.isNull()) user = root.createNestedObject("u");

      JsonArray mode = user.createNestedArray(FPSTR(_name));
      mode.add(CBSnowlightLogic::modeName(currentMode));
      mode.add(decisionReason);
    }

    void addToJsonState(JsonObject& root) override {
      if (!initDone) return;

      JsonObject usermod = root[FPSTR(_name)];
      if (usermod.isNull()) usermod = root.createNestedObject(FPSTR(_name));

      usermod["mode"] = CBSnowlightLogic::modeName(currentMode);
      usermod["reason"] = decisionReason;
      usermod["lastError"] = lastError;
      usermod["failures"] = consecutiveFailures;
      usermod["lastSuccessMs"] = lastFetchSuccessMs;
      usermod["modeHoldRemainingS"] = modeHoldRemainingSeconds();
      usermod["snowfallMm"] = weather.snowfallMm;
      usermod["cloudPct"] = weather.cloudCoverPct;
      usermod["windGustKmh"] = weather.windGustKmh;
      usermod["temperatureC"] = weather.temperatureC;
      usermod["localHour"] = weather.localHour;
      usermod["isDay"] = weather.isDay;
    }

    void readFromJsonState(JsonObject& root) override {
      if (!initDone) return;

      JsonObject usermod = root[FPSTR(_name)];
      if (usermod.isNull()) return;

      bool forceFetch = false;
      getJsonValue(usermod["fetchNow"], forceFetch);
      if (forceFetch) lastFetchAttemptMs = 0;

      const char* manualMode = usermod["mode"];
      if (!manualMode) return;

      SnowMode requested = CBSnowlightLogic::MODE_UNKNOWN;
      if (!strcasecmp(manualMode, "powder")) requested = CBSnowlightLogic::MODE_POWDER;
      else if (!strcasecmp(manualMode, "storm")) requested = CBSnowlightLogic::MODE_STORM;
      else if (!strcasecmp(manualMode, "bluebird")) requested = CBSnowlightLogic::MODE_BLUEBIRD;
      else if (!strcasecmp(manualMode, "alpenglow")) requested = CBSnowlightLogic::MODE_ALPENGLOW;
      else if (!strcasecmp(manualMode, "night")) requested = CBSnowlightLogic::MODE_NIGHT;
      else if (!strcasecmp(manualMode, "offline")) requested = CBSnowlightLogic::MODE_OFFLINE;
      else if (!strcasecmp(manualMode, "demo")) requested = CBSnowlightLogic::MODE_DEMO;

      if (requested != CBSnowlightLogic::MODE_UNKNOWN) {
        applyMode(requested, true);
      }
    }

    void addToConfig(JsonObject& root) override {
      JsonObject top = root.createNestedObject(FPSTR(_name));

      top[FPSTR(_enabled)] = enabled;
      top[FPSTR(_autoMode)] = autoModeEnabled;
      top["forceHttp"] = forceHttp;
      top["demoMode"] = demoMode;
      top["latitude"] = latitude;
      top["longitude"] = longitude;
      top["updateIntervalMinutes"] = updateIntervalMinutes;
      top["minAutoModeDurationMinutes"] = minAutoModeDurationMinutes;
      top["powderSnowfallThresholdMm"] = powderSnowfallThresholdMm;
      top["stormSnowfallThresholdMm"] = stormSnowfallThresholdMm;
      top["stormWindThresholdKmh"] = stormWindThresholdKmh;
      top["cloudThresholdPct"] = cloudThresholdPct;
      top["offlineFailureThreshold"] = offlineFailureThreshold;
      top["alpenglowMorningStartHour"] = alpenglowMorningStartHour;
      top["alpenglowMorningEndHour"] = alpenglowMorningEndHour;
      top["alpenglowEveningStartHour"] = alpenglowEveningStartHour;
      top["alpenglowEveningEndHour"] = alpenglowEveningEndHour;
      top["powderPresetId"] = powderPresetId;
      top["stormPresetId"] = stormPresetId;
      top["bluebirdPresetId"] = bluebirdPresetId;
      top["alpenglowPresetId"] = alpenglowPresetId;
      top["nightPresetId"] = nightPresetId;
      top["offlinePresetId"] = offlinePresetId;
      top["demoPresetId"] = demoPresetId;
    }

    bool readFromConfig(JsonObject& root) override {
      JsonObject top = root[FPSTR(_name)];
      bool configComplete = !top.isNull();

      configComplete &= getJsonValue(top[FPSTR(_enabled)], enabled, true);
      configComplete &= getJsonValue(top[FPSTR(_autoMode)], autoModeEnabled, true);
      configComplete &= getJsonValue(top["forceHttp"], forceHttp, false);
      configComplete &= getJsonValue(top["demoMode"], demoMode, false);
      configComplete &= getJsonValue(top["latitude"], latitude, 38.8833f);
      configComplete &= getJsonValue(top["longitude"], longitude, -106.9436f);
      configComplete &= getJsonValue(top["updateIntervalMinutes"], updateIntervalMinutes, 30);
      configComplete &= getJsonValue(top["minAutoModeDurationMinutes"], minAutoModeDurationMinutes, 15);
      configComplete &= getJsonValue(top["powderSnowfallThresholdMm"], powderSnowfallThresholdMm, 5.0f);
      configComplete &= getJsonValue(top["stormSnowfallThresholdMm"], stormSnowfallThresholdMm, 1.0f);
      configComplete &= getJsonValue(top["stormWindThresholdKmh"], stormWindThresholdKmh, 45.0f);
      configComplete &= getJsonValue(top["cloudThresholdPct"], cloudThresholdPct, 75);
      configComplete &= getJsonValue(top["offlineFailureThreshold"], offlineFailureThreshold, 3);
      configComplete &= getJsonValue(top["alpenglowMorningStartHour"], alpenglowMorningStartHour, 6);
      configComplete &= getJsonValue(top["alpenglowMorningEndHour"], alpenglowMorningEndHour, 8);
      configComplete &= getJsonValue(top["alpenglowEveningStartHour"], alpenglowEveningStartHour, 17);
      configComplete &= getJsonValue(top["alpenglowEveningEndHour"], alpenglowEveningEndHour, 19);
      configComplete &= getJsonValue(top["powderPresetId"], powderPresetId, 1);
      configComplete &= getJsonValue(top["stormPresetId"], stormPresetId, 2);
      configComplete &= getJsonValue(top["bluebirdPresetId"], bluebirdPresetId, 3);
      configComplete &= getJsonValue(top["alpenglowPresetId"], alpenglowPresetId, 4);
      configComplete &= getJsonValue(top["nightPresetId"], nightPresetId, 5);
      configComplete &= getJsonValue(top["offlinePresetId"], offlinePresetId, 6);
      configComplete &= getJsonValue(top["demoPresetId"], demoPresetId, 7);

      if (updateIntervalMinutes < 5) updateIntervalMinutes = 5;
      if (minAutoModeDurationMinutes > 120) minAutoModeDurationMinutes = 120;
      if (offlineFailureThreshold == 0) offlineFailureThreshold = 1;
      if (alpenglowMorningStartHour > 23) alpenglowMorningStartHour = 6;
      if (alpenglowMorningEndHour > 24) alpenglowMorningEndHour = 8;
      if (alpenglowEveningStartHour > 23) alpenglowEveningStartHour = 17;
      if (alpenglowEveningEndHour > 24) alpenglowEveningEndHour = 19;

      return configComplete;
    }

    void appendConfigData(Print& settingsScript) override {
      settingsScript.print(F("addInfo('")); settingsScript.print(FPSTR(_name)); settingsScript.print(F(":forceHttp',1,'Use only if HTTPS is too large for the target ESP8266 build.');"));
      settingsScript.print(F("addInfo('")); settingsScript.print(FPSTR(_name)); settingsScript.print(F(":demoMode',1,'Applies the configured demo preset instead of weather modes.');"));
      settingsScript.print(F("addInfo('")); settingsScript.print(FPSTR(_name)); settingsScript.print(F(":updateIntervalMinutes',1,'Minimum is clamped to 5 minutes.');"));
      settingsScript.print(F("addInfo('")); settingsScript.print(FPSTR(_name)); settingsScript.print(F(":minAutoModeDurationMinutes',1,'Minimum automatic hold time before changing normal weather modes. Offline, Demo, and manual commands bypass this.');"));
      settingsScript.print(F("addInfo('")); settingsScript.print(FPSTR(_name)); settingsScript.print(F(":powderSnowfallThresholdMm',1,'Current snowfall in mm needed for Powder mode.');"));
      settingsScript.print(F("addInfo('")); settingsScript.print(FPSTR(_name)); settingsScript.print(F(":stormWindThresholdKmh',1,'Wind gust threshold in km/h for Storm mode.');"));
      settingsScript.print(F("addInfo('")); settingsScript.print(FPSTR(_name)); settingsScript.print(F(":alpenglowMorningStartHour',1,'Local 24-hour start, inclusive.');"));
      settingsScript.print(F("addInfo('")); settingsScript.print(FPSTR(_name)); settingsScript.print(F(":alpenglowEveningStartHour',1,'Local 24-hour start, inclusive.');"));
    }
};

const char CBSnowlightUsermod::_name[]     PROGMEM = "CBSnowlight";
const char CBSnowlightUsermod::_enabled[]  PROGMEM = "enabled";
const char CBSnowlightUsermod::_autoMode[] PROGMEM = "autoModeEnabled";

static CBSnowlightUsermod cbSnowlightUsermod;
REGISTER_USERMOD(cbSnowlightUsermod);
