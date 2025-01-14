const container = require('../configurations/container');
const BillingRepo =container.resolve("billingRepository");
const ApiTokenRepo = require('../repos/ApiTokenRepo');
const config = require('../config');
const axios = require('axios');

// To generate token to consume telenor dcb apis

refreshToken = async() => {
    console.log("Token Refresh");
    try{
        let token = await BillingRepo.generateToken();
        let currentToken = await ApiTokenRepo.getToken();
        if(currentToken){
            // Means, token is already available, just update that one.
            let result = ApiTokenRepo.updateToken(token.access_token);
            console.log('Token updated: '+ (new Date()));
            config.telenor_dcb_api_token = token.access_token;
            updateTokenOnWorker(token.access_token);
        }else{
            // No token is there, let's add new record.
            let postData = {};
            postData.token = token.access_token;
            let result = await ApiTokenRepo.createToken(postData);
            console.log('Token added: '+ (new Date()));
            config.telenor_dcb_api_token = token.access_token;
            updateTokenOnWorker(token.access_token);
        }
    }catch(err){
        console.log(err);
    }
}

updateToken = async(currentToken) => {
    try{
        await ApiTokenRepo.updateToken(currentToken);
        console.log('Token updated on producer - '+ (new Date()));
        config.telenor_dcb_api_token = currentToken;
        updateTokenOnWorker(currentToken);
    }catch(err){
        console.log(err);
    }
}

updateTokenOnWorker = async(token) => {
    let form = {token: token};
    axios({
        method: 'post',
        url: config.paywall_worker_base_url + 'cron/updateToken',
        data: form
    }).then(function(response){
        console.log(response.data);
    }).catch(function(err){
        console.log('Error: Worker is not up and running. More: ', err.errno, ' at Address :', err.address, ', Port:', err.port);
    });
};

module.exports = {
    refreshToken: refreshToken,
    updateToken: updateToken
}
