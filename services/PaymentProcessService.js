const config = require('../config');

class PaymentProcessService {
    constructor({billingRepository, easypaisaPaymentService}){
        this.billingRepository = billingRepository;
        this.easypaisaPaymentService = easypaisaPaymentService;
    }

    async fullChargeAttempt(msisdn, packageObj, transaction_id, subscription){

        if(subscription.payment_source_id === ""){
            let subscriptionObj = {};
            subscriptionObj.packageObj = packageObj;
            subscriptionObj.msisdn = msisdn;
            subscriptionObj.transactionId = transaction_id;
            subscriptionObj.subscription = subscription;
            let response =  await this.easypaisaPaymentService.initiatePinlessTransaction(msisdn, packageObj.price_point_pkr, subscription.ep_token);
            if (response.code === 0)
                subscriptionObj.api_response = response;
            else
                subscriptionObj.api_response = '';

            return subscriptionObj;
        }else{
            return await this.billingRepo.fullChargeAttempt(msisdn, packageObj, transaction_id, subscription);
        }
    }
}

module.exports = PaymentProcessService;
