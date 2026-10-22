// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'android/*', 'ios/*', '.expo/*'],
  },
  {
    // Apostrophes in <Text> render fine; this rule targets HTML output.
    rules: { 'react/no-unescaped-entities': 'off' },
  },
]);
