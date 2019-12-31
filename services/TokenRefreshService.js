const CronJob = require('cron').CronJob;
const BillingRepo = require('../repos/BillingRepo');
const ApiTokenRepo = require('../repos/ApiTokenRepo');
const config = require('../config');

// To generate token to consume telenor dcb apis

refreshToken = async() => {
    try{
        let token = await BillingRepo.generateToken();
        let currentToken = await ApiTokenRepo.getToken();
        if(currentToken){
            // Means, token is already available, just update that one.
            let result = ApiTokenRepo.updateToken(token.access_token);
            console.log('Token updated: '+ (new Date()));
            config.telenor_dcb_api_token = token.access_token;
        }else{
            // No token is there, let's add new record.
            let postData = {};
            postData.token = token.access_token;
            let result = await ApiTokenRepo.createToken(postData);
            console.log('Token added: '+ (new Date()));
            config.telenor_dcb_api_token = token.access_token;
        }
    }catch(err){
        console.log(err);
    }
}
module.exports = {
    refreshToken: refreshToken
}
