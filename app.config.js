const { config: loadEnv } = require("dotenv");
const appJson = require("./app.json");

// Load custom env file first, then fall back to standard .env.
loadEnv({ path: ".emv", override: false, quiet: true });
loadEnv({ override: false, quiet: true });

const normalizeKey = (value) => (value || "").trim().replace(/;$/, "");
const sharedGoogleMapsKey = normalizeKey(process.env.GOOGLE_MAPS_API_KEY);
const iosGoogleMapsKey = normalizeKey(process.env.GOOGLE_MAPS_API_KEY_IOS) || sharedGoogleMapsKey;
const androidGoogleMapsKey =
  normalizeKey(process.env.GOOGLE_MAPS_API_KEY_ANDROID) || sharedGoogleMapsKey;

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
