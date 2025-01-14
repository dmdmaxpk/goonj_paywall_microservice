const axios = require('axios');
const config = require('./../config');


class BillingRepository {
    constructor({tpsCountRepository}){
        this.tpsCountRepo = tpsCountRepository;
    }

    async generateToken () {
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
    async sendMessage  (message, msisdn)  {
        console.log('Message Recipient - ', msisdn, ' - Message Body - ', message, ' - ' , (new Date()));
        var form = { messageBody: message, recipientMsisdn: msisdn, source: 'Goonj' };
        console.log("REQUEST SMS###", form);
        return new Promise(function(resolve, reject) {
            axios({
                method: 'post',
                url: config.telenor_dcb_api_baseurl + 'sms/v1/send',
                headers: {'Authorization': 'Bearer '+config.telenor_dcb_api_token, 'Content-Type': 'application/json' },
                data: form
            }).then(function(response){
                console.log("RESPONSE SMS###", response);
                resolve(response.data);
            }).catch(function(err){
                reject(err);
            });
        })
    };
    
    // This function is used to process billing without queuing the record
    async processDirectBilling (msisdn, packageObj, transaction_id)  {
        //let transactionId = msisdn+"_"+this.getRandomInt(100000);//transaction_id;
        let transactionId = transaction_id;
        
        let form = {
            "correlationID": transactionId,
            "msisdn": msisdn
        }
        form.chargableAmount = packageObj.price_point_pkr;
        console.log('Telenor Direct Billing - PartnerId - ', packageObj.partner_id,' - ', msisdn, ' - Package - ',
         packageObj.package_name, ' - Price - ', packageObj.price_point_pkr, ' - TransectionId - ', transactionId, ' - ', (new Date()));
        form.PartnerID = packageObj.partner_id;
        form.ProductID = "GoonjDCB-Charge";
    
        return new Promise(function(resolve, reject) {
            axios({
                method: 'post',
                url: config.telenor_dcb_api_baseurl + 'payment/v1/charge',
                headers: {'Authorization': 'Bearer '+config.telenor_dcb_api_token, 'Content-Type': 'application/json' },
                data: form
            }).then(function(response){
                resolve(response);
            }).catch(function(err){
                reject(err);
            });
        });
    }
    
    // Full charge request
    async fullChargeAttempt (msisdn, packageObj, transactionId, subscription)  {
        transactionId = msisdn+"_"+this.getRandomInt(100000);
        let subscriptionObj = {};
        subscriptionObj.packageObj = packageObj;
        subscriptionObj.msisdn = msisdn;
        subscriptionObj.transactionId = transactionId;
        subscriptionObj.subscription = subscription;

        let form = {
            "correlationID": transactionId,
            "msisdn": msisdn
        }
    
        console.log('Telenor Billing - PartnerId - ', packageObj.partner_id,' - ', msisdn, ' - Package - ', packageObj.package_name, ' - Price - ', packageObj.price_point_pkr, ' - TransectionId - ', transactionId, ' - ', (new Date()));
        form.chargableAmount = packageObj.price_point_pkr;
        
        form.PartnerID = packageObj.partner_id;
        form.ProductID = "GoonjDCB-Charge";
        
        let label = "label " + Date.now() + Math.random();
        console.time("[timeLog][TPAPI][FullChargeTPCall]" + label);
        return new Promise(function(resolve, reject) {
            axios({
                method: 'post',
                url: config.telenor_dcb_api_baseurl + 'payment/v1/charge',
                headers: {'Authorization': 'Bearer '+config.telenor_dcb_api_token, 'Content-Type': 'application/json' },
                data: form
            }).then(function(response){
                console.log('TP RESPONSE ', response);
                subscriptionObj.api_response = response;
                console.timeEnd("[timeLog][TPAPI][FullChargeTPCall]" + label);
                resolve(subscriptionObj);
            }).catch(function(err){
                console.timeEnd("[timeLog][TPAPI][FullChargeTPCall]" + label);
                reject(err);
            });
        })
    };
    
    // Micro charge request
    async microChargeAttempt (msisdn, packageObj, transactionId, price, subscription) {
        transactionId = msisdn+"_"+this.getRandomInt(100000);
        let subscriptionObj = {};
        subscriptionObj.packageObj = packageObj;
        subscriptionObj.msisdn = msisdn;
        subscriptionObj.transactionId = transactionId;
        subscriptionObj.subscription = subscription;

        let form = {
            "correlationID": transactionId,
            "msisdn": msisdn
        }
    
        console.log('Micro Charge Telenor Billing - PartnerId - ', packageObj.partner_id,' - ', msisdn, ' - Package - ', ' - Price - ', price, ' - TransectionId - ', transactionId, ' - ', (new Date()));
        form.chargableAmount = price;
        
        form.PartnerID = packageObj.partner_id;
        form.ProductID = "GoonjDCB-Charge";
        let label = "label " + Date.now() + Math.random();
        console.time("[timeLog][TPAPI][MicroChargeTPCall]" + label);
        return new Promise(function(resolve, reject) {
            axios({
                method: 'post',
                url: config.telenor_dcb_api_baseurl + 'payment/v1/charge',
                headers: {'Authorization': 'Bearer '+config.telenor_dcb_api_token, 'Content-Type': 'application/json' },
                data: form
            }).then(function(response){
                subscriptionObj.api_response = response;
                console.timeEnd("[timeLog][TPAPI][MicroChargeTPCall]"+ + label);
                resolve(subscriptionObj);
            }).catch(function(err){
                console.timeEnd("[timeLog][TPAPI][MicroChargeTPCall]" + label);
                reject(err);
            });
        })
    };
    
    
    // To Check if user is customer of telenor
    async subscriberQuery (msisdn)  {
        
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
    async subscribeFreeMbs (msisdn, transactionId)  {
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
    async checkBalance (msisdn)  {
        console.log('Checking Balance - ', msisdn, ' - ',(new Date()));
        const transactionId = msisdn+"__"+(new Date().toDateString());
        var form = { correlationId: transactionId, recipientMsisdn: msisdn};
        
        return new Promise(function(resolve, reject) {
            config.telenor_dcb_api_token({
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
    }

    getRandomInt(max) {
        return Math.floor(Math.random() * Math.floor(max));
    }
}
// To generate token to consume telenor dcb apis


module.exports = BillingRepository;