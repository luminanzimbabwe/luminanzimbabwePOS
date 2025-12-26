const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add resolver configuration to handle fbjs and other packages
config.resolver.sourceExts.push('jsx', 'js', 'ts', 'tsx');

// Configure asset resolution for web
config.resolver.assetExts.push(
  // Add other asset types here
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'mp4', 'mov'
);

// Add alias resolution for web
config.resolver.alias = {
  ...config.resolver.alias,
  // Add any necessary aliases here
};

module.exports = config;