const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Force zustand to use CJS build on web (avoids import.meta.env error)
const zustandRoot = path.resolve(__dirname, "node_modules", "zustand");
const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && moduleName.startsWith("zustand")) {
    // Map zustand ESM imports to CJS
    const subpath = moduleName.replace("zustand", "").replace(/^\//, "");
    const cjsFile = subpath ? path.join(zustandRoot, subpath + ".js") : path.join(zustandRoot, "index.js");
    return { type: "sourceFile", filePath: cjsFile };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
