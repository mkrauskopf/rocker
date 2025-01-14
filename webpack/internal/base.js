const settings = require("../settings");

module.exports = {
  context: settings.PROJECT_ROOT_PATH,
  target: "web",
  externalsType: "var",
  mode: settings.DEVELOPMENT ? "development" : "production",
  resolve: {
    unsafeCache: false,
    preferRelative: false,
    modules: [settings.PROJECT_SRC_PATH, settings.NODE_MODULES_PATH],
    extensions: [".js", ".jsx", ".ts", ".tsx"],
    mainFields: ["browser", "module", "main"],
    enforceExtension: false,
    symlinks: false,
    fallback: {
      process: false,
      path: require.resolve("path-browserify"),
      util: require.resolve("util/"),
    },
    alias: {},
  },
  module: {
    strictExportPresence: true,
    rules: [
      {
        parser: { requireEnsure: false },
      },
      {
        test: /\.json5?$/,
        type: "javascript/auto",
        loader: "json5-loader",
        options: {
          esModule: false,
        },
      },
    ],
  },
  cache: {
    type: "memory",
  },
  snapshot: {
    managedPaths: [settings.NODE_MODULES_PATH],
  },
};