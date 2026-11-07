const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// cheerio completo dipende da moduli Node (node:stream, parse5): su Android si usa la build "slim", basata solo su htmlparser2.
const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "cheerio") return context.resolveRequest(context, "cheerio/slim", platform);
  return (upstream ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
