// Release builds run Android lint over MapLibre and the other native modules, which runs out of
// Gradle's default 512 MB metaspace. Set here so `expo prebuild --clean` keeps it.
const { withGradleProperties } = require('expo/config-plugins');

const JVM_ARGS = '-Xmx4096m -XX:MaxMetaspaceSize=1024m';

module.exports = function withGradleMemory(config) {
  return withGradleProperties(config, (config) => {
    config.modResults = config.modResults.filter(
      (item) => !(item.type === 'property' && item.key === 'org.gradle.jvmargs')
    );
    config.modResults.push({ type: 'property', key: 'org.gradle.jvmargs', value: JVM_ARGS });
    return config;
  });
};
