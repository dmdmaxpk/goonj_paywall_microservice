const axios = require('axios')
const config = require('./../config');
const tpsCountRepo = require('../repos/tpsCountRepo');

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
    let {msisdn, packageObj, transactionId, micro_charge, price_to_charge} = subscriptionObj;
    let form = {
        "correlationID": transactionId,
        "msisdn": msisdn
    }

    if(micro_charge){
        console.log('MiniChargeTelenorBilling - PartnerId - ', packageObj.partner_id,' - ', msisdn, ' - Package - ', ' - Price - ', price_to_charge, ' - TransectionId - ', transactionId, ' - ', (new Date()));
        form.chargableAmount = price_to_charge;
    }else{
        console.log('TelenorBilling - PartnerId - ', packageObj.partner_id,' - ', msisdn, ' - Package - ', packageObj.package_name, ' - Price - ', packageObj.price_point_pkr, ' - TransectionId - ', transactionId, ' - ', (new Date()));
        form.chargableAmount = packageObj.price_point_pkr;
    }
    
    form.PartnerID = packageObj.partner_id;
    form.ProductID = "GoonjDCB-Charge";

    console.log("Form Data: ", form);
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
    await tpsCountRepo.incrementTPSCount(config.queueNames.subscriberQueryDispatcher);
    console.log('SubscriberQuery - ', msisdn );
    let object = {};
    let api_response;
    let op;

    return new Promise(function(resolve, reject) {
        axios({
            method: 'get',
            url: config.telenor_dcb_api_baseurl + `subscriberQuery/v3/checkinfo/${msisdn}`,
            headers: {'Authorization': 'Bearer '+config.telenor_dcb_api_token, 'Content-Type': 'application/json' }
        }).then(function(response){
            api_response = response.data;
            object.api_response = api_response;
            if (api_response.Message === "Success" && api_response.AssetStatus === "Active") {
                op = "telenor";
            }else{
                op = "not_telenor";
            }
            object.operator = op;
            resolve(object);
        }).catch(function(err){
            object.operator = "not_telenor";
            object.api_response = err.response.data;
            reject(object);
        });
    });
}

// To Subscribe free mbs to Goonj users
subscribeFreeMbs = async(msisdn, transactionId) => {
    console.log('SubscribeFreeMbs - ', msisdn);

    let form = {
        "correlationID": transactionId,
        "msisdn": msisdn,
        "OperationType": "1",
        "OfferKey": "502125"
    }

    console.log("FreeMbs Form - ", form);

    return new Promise(function(resolve, reject) {
        axios({
            method: 'post',
            url: config.telenor_dcb_api_baseurl + 'subscribe/v1/bundle',
            headers: {'Authorization': 'Bearer '+config.telenor_dcb_api_token, 'Content-Type': 'application/json' },
            data: form
        }).then(function(response){
            console.log("SubscribeFreeMbs Response - " , response.data);
            resolve(response.data);
        }).catch(function(err){
            reject(err);
        });
    });
}

// To check balance
checkBalance = async(msisdn) => {
    console.log('Checking Balance - ', msisdn, ' - ',(new Date()));
    const transactionId = msisdn+"__"+(new Date().toDateString());
    var form = { correlationId: transactionId, recipientMsisdn: msisdn};
    
    return new Promise(function(resolve, reject) {
        axios({
            method: 'post',
            url: config.telenor_dcb_api_baseurl + 'balanceinquiry/v1/fetch',
            headers: {'Authorization': 'Bearer '+config.telenor_dcb_api_token, 'Content-Type': 'application/json' },
            data: form
        }).then(function(response){
            console.log('Check Balance Success - ', msisdn, ' - Balance - ', response.data, ' - ',(new Date()));
            resolve(response.data);
        }).catch(function(err){
            console.log('Check Balance Error - ', msisdn, ' - Error - ', err, ' - ',(new Date()));
            reject(err);
        });
    })
};

module.exports = {
    generateToken: generateToken,
    sendMessage: sendMessage,
    subscribePackage: subscribePackage,
    sendMessage: sendMessage,
    subscriberQuery: subscriberQuery,
    checkBalance: checkBalance,
    subscribeFreeMbs: subscribeFreeMbs
}