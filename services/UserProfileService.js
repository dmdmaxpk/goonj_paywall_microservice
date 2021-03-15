var fs = require('fs');
var AWS = require('aws-sdk');

uploadPpToS3 = async(fileName, user_id) => {

    const ID = '';
    const SECRET = '';
    const BUCKET_NAME = ''; 

    const s3 = new AWS.S3({
        accessKeyId: ID,
        secretAccessKey: SECRET
    });
    const file = fs.readFileSync(fileName);

    const params = {
        Bucket: BUCKET_NAME,
        Key: `${user_id}.jpg`, // File name you want to save as in S3
        Body: file
    };

    var location = '';

    s3.upload(params, function (err, data) {
        // Whether there is an error or not, delete the temp file
        fs.unlink(file.path, function (err) {
            if (err) {
                console.error(err);
            }
            console.log('Temp File Delete');
        });
        console.log("PRINT FILE:", file);

        if (err) {
            throw err;
        }
        else {
            console.log('Successfully uploaded data');
            location = data.Location;
        }
    });
    return location;
}

module.exports = {
    uploadPpToS3: uploadPpToS3
}