const os = require("os");
const path = require("path");
const jest = require("jest");

exports.run = async function () {
	await jest.run([
		"--colors",
		"--passWithNoTests",
		"--detectOpenHandles",
		"--injectGlobals",
		"--noStackTrace",
		"--resetMocks",
		"--restoreMocks",
		`--maxWorkers=${os.cpus().length}`,
		"--config",
		path.resolve(__dirname, "../../jest/index.js"),
	]);
};