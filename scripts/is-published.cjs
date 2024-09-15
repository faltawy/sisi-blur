const packageJson = require('../package.json');

function isPublished(version) {
    const published = packageJson.version;
    return version === published;
}
