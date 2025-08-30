const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Platform-specific resolver to avoid importing native modules on web
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.sourceExts.push('web.js', 'web.ts', 'web.tsx');

// Enable better support for dynamic imports
config.transformer.asyncRequireModulePath = require.resolve(
  'metro-runtime/src/modules/asyncRequire'
);

// Better resolver for external packages like Leaflet
config.resolver.nodeModulesPaths = [
  `${__dirname}/node_modules`,
];

module.exports = config;