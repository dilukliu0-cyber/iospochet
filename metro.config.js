const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// @supabase/postgrest-js ships a package.json "exports" field pointing at a
// dist/index.mjs that doesn't exist in the published package, which breaks
// Metro's package-exports resolution. Falling back to file-based resolution
// fixes it (documented Supabase + Expo/Metro workaround).
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
