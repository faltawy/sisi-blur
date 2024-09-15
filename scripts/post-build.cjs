const fs = require('node:fs');
const path = require('node:path');
const { cwd } = require('node:process');

const BUILD_DIR = path.join(cwd(), 'build/firefox-mv2-prod');

function postBuild() {
    const manifest = require(BUILD_DIR + '/manifest.json');
    manifest.version = {
        "number": manifest.version,
        "license": "MIT",
    }
    fs.writeFileSync(BUILD_DIR + '/manifest.json', JSON.stringify(manifest, null, 2));
}

postBuild();