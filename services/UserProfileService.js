var AWS = require('aws-sdk');

const ID = 'AKIAZQA2XAWP5WFVOBU5';
const SECRET = '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';
const BUCKET_NAME = 'content-dmd';
const FILE_PATH = 'TP-Content/static-content/user-profile-pictures/';

const s3 = new AWS.S3({
    accessKeyId: ID,
    secretAccessKey: SECRET
});

uploadPpToS3 = async(file, user_id) => {

    const params = {Bucket: BUCKET_NAME, Key: `${FILE_PATH}${user_id}.jpg`, Body: file.data};
    let response = await uploadAndReturnPath(params);
    if (response)
        return response.Location;
    else
        return undefined;
}

uploadAndReturnPath = async (params) => {
    return new Promise((resolve, reject) => {
        s3.upload(params, (err, data) => {
            if(err)
                reject(err);
            else
                resolve(data);
        });
    });
}
module.exports = {
    uploadPpToS3: uploadPpToS3,
    uploadAndReturnPath: uploadAndReturnPath
}