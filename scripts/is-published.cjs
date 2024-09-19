const packageJson = require('../package.json');
var jwt = require('jsonwebtoken');
const { env } =  require('node:process');

const detailsEndpoint = "https://addons.mozilla.org/api/v5/addons/addon/c63486b6e6dc4c47b562/";

async function getDetails(secret) {
    var issuedAt = Math.floor(Date.now() / 1000);
    var payload = {
        iss: process.env.JWT_USERNAME,
        jti: Math.random().toString(),
        iat: issuedAt,
        exp: issuedAt + 60,
    };
    var token = jwt.sign(payload, secret, {
        algorithm: 'HS256',  
      });
    const Authorization = `JWT ${token}`;
    const data = await fetch(detailsEndpoint, {
        headers: {
            Authorization,
        },
    });

    return data.json();
}

async function isPublished(version) {
    const apiKey = process.env.JWT_SECRET;
    const details = await getDetails(apiKey);
    const publishedVersion = details.version;
    if (publishedVersion === version) {
        console.log('✅ Version is published');
        env.SHOULD_PUBLISH = 'true';
    } else {
        console.log('❌ Version is not published');
        env.SHOULD_PUBLISH = 'false';
    }
}

isPublished(packageJson.version);
