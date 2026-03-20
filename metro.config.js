const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

const config = getDefaultConfig(__dirname);
const input = pathToFileURL(path.resolve(__dirname, "global.css")).href;

module.exports = withNativeWind(config, { input });
