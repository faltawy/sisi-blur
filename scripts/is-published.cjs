const packageJson = require('../package.json');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const detailsEndpoint = "https://addons.mozilla.org/api/v5/addons/addon/c63486b6e6dc4c47b562/";

async function getDetails(secret) {
    const issuedAt = Math.floor(Date.now() / 1000);
    const payload = {
        iss: process.env.JWT_USERNAME,
        jti: Math.random().toString(),
        iat: issuedAt,
        exp: issuedAt + 60,
    };
    const token = jwt.sign(payload, secret, {
        algorithm: 'HS256',  
    });
    const Authorization = `JWT ${token}`;
    const response = await fetch(detailsEndpoint, {
        headers: {
            Authorization,
        },
    });

    return response.json();
}

async function isPublished(version) {
    const apiKey = process.env.JWT_SECRET;
    const details = await getDetails(apiKey);
    const publishedVersion = details.version;
    const shouldPublish = publishedVersion !== version;
    
    console.log(`Current version: ${version}`);
    console.log(`Published version: ${publishedVersion}`);
    console.log(`Should publish: ${shouldPublish}`);

    // Write result to a file that can be read by GitHub Actions
    fs.writeFileSync(path.join(__dirname, '..', 'should_publish'), shouldPublish ? 'true' : 'false');
}

isPublished(packageJson.version);