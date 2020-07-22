const config = require('../config');
const helper = require('./../helper/helper');

class PaymentProcessService {
    constructor({billingRepository, easypaisaPaymentService, telenorBillingService}){
        this.billingRepository = billingRepository;
        this.easypaisaPaymentService = easypaisaPaymentService;
        this.telenorBillingService = telenorBillingService;
    }

    async fullChargeAttempt(msisdn, packageObj, transaction_id, subscription){
        if(subscription.payment_source === "easypaisa"){
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

    async processDirectBilling(otp, user, subscription, packageObj, first_time_billing){
        console.log("processDirectBilling - OTP - ", otp, ' - Source - ', subscription.payment_source);
        if(subscription.payment_source === "easypaisa"){
            let returnObject = {};
            try{
                let response = {};
                if(otp){
                    response = await this.easypaisaPaymentService.initiateLinkTransaction(user.msisdn, packageObj.price_point_pkr, otp);
                }else{
                    let transaction_id = "GoonjDirectChargeEP_"+subscription_id+"_"+packageObj.price_point_pkr+"_"+helper.getCurrentDate();
                    response = await fullChargeAttempt(user.msisdn, packageObj, transaction_id, subscription);
                }
                
                if(response && (response.responseDesc === "SUCCESS" || response.responseDesc === "Success")){
                    returnObject.message = "success";
                    returnObject.tokenNumber = response.tokenNumber;
                    returnObject.api_response = response;
                }else{
                    returnObject.message = "failed";
                    returnObject.tokenNumber = response.tokenNumber ? response.tokenNumber : undefined;
                    returnObject.api_response = response;
                }
                return returnObject;
            }catch(err){
                console.log("Error thrown from easypaisa processDirectBilling: ", err);
                throw err;
            }
        }else{
            try{
                let response = await this.telenorBillingService.processDirectBilling(user, subscription, packageObj, first_time_billing);
                return response;
            }catch(err){
                console.log("Error thrown from telenor processDirectBilling: ", err);
                throw err;
            }
        }
    }
}

module.exports = PaymentProcessService;
