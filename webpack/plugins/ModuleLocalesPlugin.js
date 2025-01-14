const settings = require("../settings");
const fs = require("fs");
const path = require("path");

class ModuleLocalesPlugin {
  constructor(options) {
    this.from = options.from;
    this.paths_to_watch = [];
    for (const language of settings.SUPPORTED_LOCALES) {
      this.paths_to_watch.push(`${language}.json`);
    }
  }

  apply(compiler) {
    compiler.hooks.thisCompilation.tap(ModuleLocalesPlugin.name, (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: ModuleLocalesPlugin.name,
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
        },
        (_assets) => {
          let paths = [];

          for (const entryPoint of compilation.entrypoints.values()) {
            let entryPointOrigin = null;

            for (const origin of entryPoint.origins) {
              if (origin.request.indexOf("webpack") !== -1) {
                continue;
              }
              entryPointOrigin = path.resolve(origin.request.split("src")[0]);
            }

            for (const chunk of entryPoint.chunks) {
              paths.push({
                input: path.resolve(this.from, entryPointOrigin, "messages"),
                output: path.join(path.dirname(compilation.outputOptions.assetModuleFilename), chunk.name, "messages"),
              });
            }
          }

          for (const asset of this.paths_to_watch) {
            for (const chunk of paths) {
              const inputPath = path.resolve(chunk.input, asset);
              const outputPath = path.join(chunk.output, asset);

              fs.promises
                .readFile(inputPath, "utf8")
                .catch(async () => {
                  await new Promise((resolve, reject) => {
                    const parent = path.dirname(inputPath);
                    fs.stat(parent, (stat_err, _stat) => {
                      if (stat_err === null) {
                        resolve(true);
                      } else if (stat_err.code === "ENOENT") {
                        resolve(true);
                        fs.mkdir(parent, (mkdir_err) => {
                          if (mkdir_err) {
                            reject(mkdir_err);
                          } else {
                            resolve(true);
                          }
                        });
                      } else {
                        reject(stat_err);
                      }
                    });
                  });
                  const content = "{}";
                  await fs.promises.writeFile(inputPath, content);
                  return content;
                })
                .then((content) => {
                  compilation.fileDependencies.add(inputPath);
                  if (!compilation.getAsset(outputPath)) {
                    compilation.emitAsset(outputPath, new compiler.webpack.sources.RawSource(content));
                  }
                })
                .catch((error) => {
                  console.error(error);
                });
            }
          }
        },
      );
    });
  }
}

module.exports = ModuleLocalesPlugin;