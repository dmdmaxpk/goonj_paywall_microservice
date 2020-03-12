const axios = require('axios')
const config = require('./../config');

// To generate token to consume telenor dcb apis
generateToken = async () => {
    return new Promise(function(resolve, reject) {
        axios({
            method: 'post',
            url: config.telenor_dcb_api_baseurl + 'oauthtoken/v1/generate?grant_type=client_credentials',
            headers: {'Authorization': 'Basic Y1J2dW5mTml3d0pJbzlpRzhUT1Zxdk1aMThXSXpXRlQ6TnlEVkdLanZhMFBvNkk1Qw==',
            'Content-Type': 'application/x-www-form-urlencoded' }
        }).then(function(response){
            resolve(response.data);
        }).catch(function(err){
            reject(err);
        });
    });
}

// To send messages
sendMessage = async(message, msisdn) => {
    console.log('Message Recipient - ', msisdn, ' - Message Body - ', message, ' - ' , (new Date()));
    var form = { messageBody: message, recipientMsisdn: msisdn, source: 'Goonj' };
    
    return new Promise(function(resolve, reject) {
        axios({
            method: 'post',
            url: config.telenor_dcb_api_baseurl + 'sms/v1/send',
            headers: {'Authorization': 'Bearer '+config.telenor_dcb_api_token, 'Content-Type': 'application/json' },
            data: form
        }).then(function(response){
            resolve(response.data);
        }).catch(function(err){
            reject(err);
        });
    })
};


// To subscribe package
subscribePackage = async(subscriptionObj) => {
    let {msisdn, packageObj, transactionId} = subscriptionObj;
    console.log('TelenorBilling - PartnerId - ', packageObj.partner_id,' - ', msisdn, ' - Package - ', packageObj.package_name, ' - Price - ', packageObj.price_point_pkr, ' - TransectionId - ', transactionId, ' - ', (new Date()));
    
    let form = {
        "correlationID": transactionId,
        "msisdn": msisdn,
        "chargableAmount": packageObj.price_point_pkr,
        "PartnerID": packageObj.partner_id,
        "ProductID": "GoonjDCB-Charge"
    }
    
    return new Promise(function(resolve, reject) {
        axios({
            method: 'post',
            url: config.telenor_dcb_api_baseurl + 'payment/v1/charge',
            headers: {'Authorization': 'Bearer '+config.telenor_dcb_api_token, 'Content-Type': 'application/json' },
            data: form
        }).then(function(response){
            subscriptionObj.api_response = response;
            resolve(subscriptionObj);
        }).catch(function(err){
            reject(err);
        });
    })
};


// To Check if user is customer of telenor
subscriberQuery = async(msisdn) => {
    console.log('subscriberQuery - PartnerId - ', msisdn );
    
    return new Promise(function(resolve, reject) {
        axios({
            method: 'get',
            url: config.telenor_dcb_api_baseurl + `subscriberQuery/v3/checkinfo/${msisdn}`,
            headers: {'Authorization': 'Bearer '+config.telenor_dcb_api_token, 'Content-Type': 'application/json' }
        }).then(function(response){
            console.log("subscriberQuery Response" , response);
            resolve(response);
        }).catch(function(err){
            reject(err);
        });
    })
};

module.exports = {
    generateToken: generateToken,
    sendMessage: sendMessage,
    subscribePackage: subscribePackage,
    sendMessage: sendMessage,
    subscriberQuery: subscriberQuery
}