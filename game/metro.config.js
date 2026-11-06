const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const config = getDefaultConfig(__dirname);
const STUB = path.join(__dirname, ".webstub/stub.js");
const STUBS = ["react-native-google-mobile-ads", "expo-iap", "expo-notifications"];
config.resolver.resolveRequest = (ctx, name, platform) => {
  if (platform === "web" && STUBS.some((s) => name === s || name.startsWith(s + "/"))) return { type: "sourceFile", filePath: STUB };
  return ctx.resolveRequest(ctx, name, platform);
};
module.exports = config;
