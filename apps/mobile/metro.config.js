const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;
// Monorepo: Next.js en raíz usa react 19.3.x; RN 0.81 exige el renderer 19.1.0.
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, "node_modules/react"),
};

module.exports = config;
