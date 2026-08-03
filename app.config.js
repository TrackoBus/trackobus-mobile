const { config: loadEnv } = require("dotenv");
const appJson = require("./app.json");

// Load .env file into process.env
loadEnv({ override: false });

const normalizeKey = (value) => (value || "").trim().replace(/;$/, "");

// Google Maps API keys — sourced from .env
const sharedEnvKey = normalizeKey(process.env.GOOGLE_MAPS_API_KEY);
const androidGoogleMapsKey =
  normalizeKey(process.env.GOOGLE_MAPS_API_KEY_ANDROID) || sharedEnvKey;
const iosGoogleMapsKey =
  normalizeKey(process.env.GOOGLE_MAPS_API_KEY_IOS) || sharedEnvKey;

module.exports = () => {
  const expoConfig = appJson.expo;

  return {
    ...expoConfig,
    ios: {
      ...expoConfig.ios,
      config: {
        ...(expoConfig.ios?.config || {}),
        googleMapsApiKey: iosGoogleMapsKey,
      },
    },
    android: {
      ...expoConfig.android,
      config: {
        ...(expoConfig.android?.config || {}),
        googleMaps: {
          ...(expoConfig.android?.config?.googleMaps || {}),
          apiKey: androidGoogleMapsKey,
        },
      },
    },
  };
};
