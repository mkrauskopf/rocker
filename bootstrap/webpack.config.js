const path = require("path");
const webpack = require("webpack");
const settings = require("../webpack/settings");
const config = require("../webpack/config/dll.js");

config.entry = {
  bootstrap: ["@lastui/rocker/bootstrap"],
};

config.resolve.alias["@lastui/rocker/platform"] = "@lastui/rocker/platform/kernel";

config.plugins.push(
  new webpack.DllReferencePlugin({
    manifest: path.resolve(
      __dirname,
      `../dependencies/dll/dependencies-${settings.DEVELOPMENT ? "dev" : "prod"}-manifest.json`,
    ),
    context: settings.PROJECT_ROOT_PATH,
  }),
  new webpack.DllReferencePlugin({
    manifest: path.resolve(
      __dirname,
      `../platform/dll/platform-${settings.DEVELOPMENT ? "dev" : "prod"}-manifest.json`,
    ),
    context: settings.PROJECT_ROOT_PATH,
  }),
);

module.exports = config;