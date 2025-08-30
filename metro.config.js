const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Platform-specific resolver to avoid importing native modules on web
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.sourceExts.push('web.js', 'web.ts', 'web.tsx');

module.exports = config;