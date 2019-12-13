const axios = require('axios')
const config = require('./../config');

// To generate token to consume telenor dcb apis
generateToken = async () => {
    return new Promise(function(resolve, reject) {
        axios({
            method: 'post',
            url: config.telenor_dcb_api_baseurl + '/oauthtoken/v1/generate?grant_type=client_credentials',
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



authToken, msisdn, source, packageName) => {
    if(packageName !== undefined){
        let pkg = await Packages.findOne({package: packageName});
        if(pkg !== undefined && pkg !== null){
            var transactionId = "GoonjB_"+msisdn+"_"+getCurrentDate();
            var options = {
                url: "https://apis.telenor.com.pk/payment/v1/charge",
                headers: {
                    'Authorization': 'Bearer '+authToken,
                    'Content-Type': 'application/json'
                }, json: {
                    "correlationID": transactionId,
                    "msisdn": msisdn,
                    "chargableAmount": pkg.price,
                    "sendSMSOnSuccess": "",//not in use
                    "smsMsg": "",//not in use
                    "PartnerID": "TP-GoonjDCB",
                    "ProductID": "GoonjDCB-Charge"
                }
            };
            console.log("[TelenorBilling]="+msisdn);
            // Return new promise
            return new Promise(function(resolve, reject) {
                request.post(options, function(err, resp, body) {
                    if (err) {
                        console.log(err);
                        console.log(body);
                        reject(err);
                    } else {
                        var object = body;
                        object.msisdn = msisdn;
                        object.source = source;
                        object.package = packageName;
                        object.transaction_id = transactionId;
                        resolve(object);
                    }
                });
            });
        }else{
            let isRemoved = await BillingQueue.remove({msisdn: msisdn});
            if(isRemoved){
                console.log(msisdn +" record removed due to no package details");
            }
        }
    }else{
        let isRemoved = await BillingQueue.remove({msisdn: msisdn});
        if(isRemoved){
            console.log(msisdn +" record removed due to no package details");
        }
    }
}


// To subscribe package
sendMessage = async(price, package, msisdn) => {
    console.log('Charge  - ', msisdn, ' - Package - ', package, ' -  Price - ', price, ' - ' , (new Date()));
    let transactionId = "GoonjPlus_"+msisdn+"_"+getCurrentDate();
    let form = {
        "correlationID": transactionId,
        "msisdn": msisdn,
        "chargableAmount": price,
        "sendSMSOnSuccess": "",//not in use
        "smsMsg": "",//not in use
        "PartnerID": "TP-GoonjDCB",
        "ProductID": "GoonjDCB-Charge"
    }

    return new Promise(function(resolve, reject) {
        axios({
            method: 'post',
            url: config.telenor_dcb_api_baseurl + 'payment/v1/charge',
            headers: {'Authorization': 'Bearer '+config.telenor_dcb_api_token, 'Content-Type': 'application/json' },
            data: form
        }).then(function(response){
            resolve(response.data);
        }).catch(function(err){
            reject(err);
        });
    })
};

// Helper functions
function getCurrentDate() {
    var now = new Date();
    var strDateTime = [
        [now.getFullYear(),
            AddZero(now.getMonth() + 1),
            AddZero(now.getDate())].join("-"),
        [AddZero(now.getHours()),
            AddZero(now.getMinutes())].join(":")];
    return strDateTime;
}

function AddZero(num) {
    return (num >= 0 && num < 10) ? "0" + num : num + "";
}

module.exports = {
    generateToken: generateToken,
    sendMessage: sendMessage
}