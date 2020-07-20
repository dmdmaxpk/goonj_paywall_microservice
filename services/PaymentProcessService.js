const config = require('../config');

class PaymentProcessService {
    constructor({billingRepository, easypaisaPaymentService}){
        this.billingRepository = billingRepository;
        this.PaymentProcessService = PaymentProcessService;
    }

    async fullChargeAttempt(msisdn, packageObj, transaction_id, subscription){
        if(subscription.payment_source_id === ""){
            
        }else{
            return await this.billingRepo.fullChargeAttempt(msisdn, packageObj, transaction_id, subscription);
        }
    }
}

module.exports = PaymentProcessService
