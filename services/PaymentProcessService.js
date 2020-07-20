const config = require('../config');

class PaymentProcessService {
    constructor({billingRepository, easypaisaPaymentService}){
        this.billingRepository = billingRepository;
        this.PaymentProcessService = PaymentProcessService;
        this.easypaisaPaymentService = easypaisaPaymentService;
    }

    async fullChargeAttempt(msisdn, packageObj, transaction_id, subscription){

        if (subscription.payment_source_id){
            let record = await this.easypaisaPaymentService.bootTransactionScript(requestData.msisdn, requestData.amount, easypaisaToken, requestData.opt);

        }
    }
}

module.exports = PaymentProcessService;
