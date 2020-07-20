const config = require('../config');
const e = require('express');

class PaymentProcessService {
    constructor({billingRepository, easypaisaPaymentService}){
        this.billingRepository = billingRepository;
        this.easypaisaPaymentService = easypaisaPaymentService;
    }

    async fullChargeAttempt(msisdn, packageObj, transaction_id, subscription){
        if(subscription.payment_source_id === ""){
            let returnObject = {};
            try{
                let response =  await this.easypaisaPaymentService.initiatePinlessTransaction(msisdn, packageObj, transaction_id, subscription);
                if(response.responseDesc === "SUCCESS"){
                    returnObject.message = "Success";
                    returnObject.api_response = response;
                }else{
                    returnObject.message = "Failed";
                    returnObject.api_response = response;
                }
                return returnObject;
            }catch(err){
                throw err;
            }
        }else{
            let returnObject = {};
            try{
                let response = await this.billingRepo.fullChargeAttempt(msisdn, packageObj, transaction_id, subscription);
                if(response.api_response.data.Message === "Success"){
                    returnObject.message = "Success";
                    returnObject.api_response = response;
                }else{
                    returnObject.message = "Failed";
                    returnObject.api_response = response;
                }
                return returnObject;
            }catch(err){
                console.log("Error thrown from telenor billing: ", err);
                throw err;
            }
        }
    }
}

module.exports = PaymentProcessService;
