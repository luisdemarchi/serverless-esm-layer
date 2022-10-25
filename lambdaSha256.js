
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({
    region: 'us-west-2'
});

const lambdaName = 'CreatePost';
const filePath = path.resolve(__dirname, 'tmp/create-post.zip');

lambda.getFunction({
    FunctionName: lambdaName
}, (error, data) => {
    if(error) {
        console.error(error);
        return;
    }
    const lambdaSha256 = data.Configuration.CodeSha256;

    const shasum = crypto.createHash('sha256');
    fs.createReadStream(filePath)
    .on('data', (chunk) => {
        shasum.update(chunk);
    })
    .on('end', () => {
        const sha256 = shasum.digest('base64');
        if(sha256 === lambdaSha256) {
            console.log('No need to upload, sha hashes are the same');
        } else {
            console.log('That needs to be uploaded again son.');
        }
        process.exit();
    });
});
