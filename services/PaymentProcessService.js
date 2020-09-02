const config = require('../config');
const helper = require('./../helper/helper');
const { resolve } = require('../configurations/container');
const axios = require('axios');

class PaymentProcessService {
    constructor({billingRepository, easypaisaPaymentService, telenorBillingService, 
        subscriptionRepository, billingHistoryRepository, tpsCountRepository, messageRepository, userRepository ,packageRepository }){
        this.billingRepository = billingRepository;
        this.easypaisaPaymentService = easypaisaPaymentService;
        this.telenorBillingService = telenorBillingService;
        this.subscriptionRepo = subscriptionRepository;
        this.billingHistoryRepo = billingHistoryRepository;

        this.tpsCountRepo = tpsCountRepository;
        this.packageRepo = packageRepository;
        this.messageRepo = messageRepository;
        this.userRepo = userRepository;
    }

    async fullChargeAttempt(msisdn, packageObj, transaction_id, subscription){
        if(subscription.payment_source === "easypaisa"){
            let returnObject = {};
            try{
                let response =  await this.easypaisaPaymentService.initiatePinlessTransaction(msisdn, packageObj.price_point_pkr, transaction_id, subscription);
                if(response.message === "success"){
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
                let response = await this.billingRepository.fullChargeAttempt(msisdn, packageObj, transaction_id, subscription);
                if(response.api_response.data.Message === "Success"){
                    returnObject.message = "Success";
                    returnObject.api_response = response;
                }else{
                    returnObject.message = "Failed";
                    returnObject.api_response = response;
                }
                return returnObject;
            }catch(err){
                if(err && err.response){
                    console.log('Error ',err.response.data);
                }
                throw err;
            }
        }
    }

    async microChargeAttempt(msisdn, packageObj, transaction_id, micro_price, subscription){
        if(subscription.payment_source === "easypaisa"){
            let returnObject = {};
            try{
                returnObject.packageObj = packageObj;
                returnObject.msisdn = msisdn;
                returnObject.transactionId = transaction_id;
                returnObject.subscription = subscription;

                let response =  await this.easypaisaPaymentService.initiatePinlessTransaction(msisdn, micro_price, transaction_id, subscription);
                if(response.message === "success"){
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
                let response = await this.billingRepository.microChargeAttempt(msisdn, packageObj, transaction_id, micro_price, subscription);
                if(response.api_response.data.Message === "Success"){
                    returnObject.message = "Success";
                    returnObject.api_response = response;
                }else{
                    returnObject.message = "Failed";
                    returnObject.api_response = response;
                }
                return returnObject;
            }catch(err){
                if(err && err.response){
                    console.log('Error ',err.response.data);
                }
                throw err;
            }
        }
    }

    async processDirectBilling(otp, user, subscription, packageObj, first_time_billing){
        console.log("PaymentProcessService - processDirectBilling");
        // Check if the subscription is active or blocked for some reason.

        if (subscription.active === true) {
            let returnObject = {};
            if (subscription.amount_billed_today < config.maximum_daily_payment_limit_pkr ) {
                if(subscription.payment_source === 'easypaisa'){
                    let tpsCount = await this.tpsCountRepo.getTPSCount(config.queueNames.easypaisaDispatcher);
                    console.log('EP - TPS Count: ', tpsCount);
                    if (tpsCount < config.ep_subscription_api_tps) {
                        console.log('Tps is in range as of now');

                        await this.tpsCountRepo.incrementTPSCount(config.queueNames.easypaisaDispatcher);
                        returnObject = await this.doProcess(otp, user, subscription, packageObj, first_time_billing);
                        return returnObject;
                    }else{
                        console.log("TPS quota full for ep subscription, waiting for 1 second to elapse - ", new Date());
                        setTimeout(async () => {
                            console.log("Calling ep consume subscription queue after 1-seconds",user.msisdn);
                            let response = await this.processDirectBilling(otp, user, subscription, packageObj, first_time_billing);
                            return response;
                        }, 1000);
                    } 
                }else{
                    let tpsCount = await this.tpsCountRepo.getTPSCount(config.queueNames.subscriptionDispatcher);
                    if (tpsCount < config.local_subscription_api_tps) {
                        await this.tpsCountRepo.incrementTPSCount(config.queueNames.subscriptionDispatcher);
                        returnObject = await this.doProcess(otp, user, subscription, packageObj, first_time_billing);
                        return returnObject;
                    }else{
                        console.log("TPS quota full for subscription, waiting for second to elapse - ", new Date());
                        setTimeout(async () => {
                            console.log("Calling consume subscription queue after 300 seconds",user.msisdn);
                            let response = await this.processDirectBilling(otp, user, subscription, packageObj, first_time_billing);
                            return response;
                        }, 300);
                    }    
                } 
            }else{
                returnObject.shootExcessiveBillingEmail = true;
                resolve(returnObject);
            }
        }else{
            console.log("Not an active subscription");
        }
    }

    async doProcess(otp, user, subscription, packageObj, first_time_billing){
        console.log('doProcess');

        let returnObject = {};
        console.log("processDirectBilling - OTP - ", otp, ' - Source - ', subscription.payment_source);
        
        let api_response = {};
        if(subscription.payment_source === "easypaisa"){
            try{  
                if(subscription.ep_token){
                    console.log("easypaisa - pinless");
                    api_response = await this.easypaisaPaymentService.initiatePinlessTransaction(user.msisdn, packageObj.price_point_pkr, undefined, subscription);
                }else{
                    if(otp ){
                        console.log("easypaisa - otp");
                        api_response = await this.easypaisaPaymentService.initiateLinkTransaction(user.msisdn, packageObj.price_point_pkr, otp);
                    }else{
                        returnObject.message = "failed"
                        returnObject.desc = 'Easypaisa OTP not found';
                    }    
                }
                
                
                if(api_response && api_response.message === "success"){
                    subscription.ep_token = api_response.response.response.tokenNumber ? api_response.response.response.tokenNumber : undefined;
                    console.log("easypaisa - success - saving response ", subscription);
                }else{
                    // Failed
                    if(api_response.response.response.responseCode === '0030'){
                        returnObject.desc = 'Invalid OTP Entered';
                    }else if(api_response.response.response.responseCode === '0034'){
                        returnObject.desc = 'OTP Expired';
                    }else if(api_response.response.response.responseCode === '---'){
                        // Todo: Need to enter response code
                        returnObject.desc = 'Invalid Transaction Amount';
                    }else if(api_response.response.response.responseCode === '0011'){
                        returnObject.desc = 'Wrong PIN Entered';
                    }else if(api_response.response.response.responseCode === '0012'){
                        returnObject.desc = 'PIN Not Entered';
                    }else if(api_response.response.response.responseCode === '0013'){
                        returnObject.desc = 'Insufficient Balance';
                    }else if(api_response.response.response.responseCode === '0014'){
                        returnObject.desc = 'Account Doesnt Exist';
                    }else if(api_response.response.response.responseCode === '0018'){
                        returnObject.desc = 'Token Already Exist';
                    }else{
                        returnObject.desc = 'Failed to process, please try again.';
                    }
                }
            }catch(err){
                if(err && err.response){
                    console.log('Error ',err.response.data);
                }
                throw err;
            }
        }else{
            try{
                api_response = await this.telenorBillingService.processDirectBilling(user, subscription, packageObj, first_time_billing);
            }catch(err){
                if(err && err.response){
                    console.log('Error ',err.response.data);
                }
                throw err;
            }
        }

        returnObject.message = api_response ? api_response.message : 'failed';
        returnObject.response = api_response ? api_response.response : returnObject.desc;
        returnObject.subscriptionObj = subscription;

        if(api_response && api_response.message === "success"){
            await this.billingSuccess(user, subscription, api_response.response, packageObj, api_response.transaction_id, first_time_billing);
        }else{
            await this.billingFailed(user, subscription, api_response.response, packageObj, api_response.transaction_id, first_time_billing);
        }
        return returnObject;
    }

    async deLink(user, subscription){
        console.log("deLink");
        let api_response = await this.easypaisaPaymentService.deactivateLinkTransaction("03336106083", "0000861994");
        if(api_response && api_response.message === 'success'){
            console.log('Success DeLinking EP_token');
            return api_response;
        }else{
            console.log('Failed DeLinking EP_token');
            return api_response;
        }
    }

    async billingSuccess (user, subscription, response, packageObj, transaction_id, first_time_billing)  {

        // Success billing
        let nextBilling = new Date();
        nextBilling.setHours(nextBilling.getHours() + packageObj.package_duration);

        let updatedSubscription = undefined;
        if (!first_time_billing) {
             // Update subscription
            let subscriptionObj = {};
            subscriptionObj.subscription_status = 'billed';
            subscriptionObj.auto_renewal = true;
            subscriptionObj.is_billable_in_this_cycle = false;
            subscriptionObj.is_allowed_to_stream = true;
            subscriptionObj.last_billing_timestamp = new Date();
            subscriptionObj.next_billing_timestamp = nextBilling;
            subscriptionObj.amount_billed_today =  (subscription.amount_billed_today + packageObj.price_point_pkr);
            subscriptionObj.total_successive_bill_counts = ((subscription.total_successive_bill_counts ? subscription.total_successive_bill_counts : 0) + 1);
            subscriptionObj.consecutive_successive_bill_counts = ((subscription.consecutive_successive_bill_counts ? subscription.consecutive_successive_bill_counts : 0) + 1);
            subscriptionObj.subscribed_package_id = packageObj._id;
            subscriptionObj.queued = false;
            subscriptionObj.payment_source = subscription.payment_source;
            if(subscription.ep_token){
                subscriptionObj.ep_token = subscription.ep_token;
            }
            
            await this.subscriptionRepo.updateSubscription(subscription._id, subscriptionObj);
        } else {
            subscription.subscription_status = 'billed';
            subscription.auto_renewal = true;
            subscription.is_billable_in_this_cycle = false;
            subscription.is_allowed_to_stream = true;
            subscription.last_billing_timestamp = new Date();
            subscription.next_billing_timestamp = nextBilling;
            subscription.amount_billed_today =  (subscription.amount_billed_today + packageObj.price_point_pkr);
            subscription.total_successive_bill_counts = ((subscription.total_successive_bill_counts ? subscription.total_successive_bill_counts : 0) + 1);
            subscription.consecutive_successive_bill_counts = ((subscription.consecutive_successive_bill_counts ? subscription.consecutive_successive_bill_counts : 0) + 1);
            subscription.subscribed_package_id = packageObj._id;
            subscription.queued = false;

            if(subscription.affiliate_unique_transaction_id && subscription.affiliate_mid){
                subscription.should_affiliation_callback_sent = true;
            }else{
                subscription.should_affiliation_callback_sent = false;
            }
            
            let updatedSubscription = await this.subscriptionRepo.createSubscription(subscription);

            // Check for the affiliation callback
            if( updatedSubscription.affiliate_unique_transaction_id && 
                updatedSubscription.affiliate_mid && 
                updatedSubscription.is_affiliation_callback_executed === false &&
                updatedSubscription.should_affiliation_callback_sent === true){
                if((updatedSubscription.source === "HE" || updatedSubscription.source === "affiliate_web") && updatedSubscription.affiliate_mid != "1") {
                    // Send affiliation callback
                    this.sendAffiliationCallback(
                        updatedSubscription.affiliate_unique_transaction_id, 
                        updatedSubscription.affiliate_mid,
                        user._id,
                        updatedSubscription._id,
                        updatedSubscription.subscriber_id,
                        packageObj._id,
                        packageObj.paywall_id
                        );
                }
            }

        }
        // Add history record
        let history = {};
        history.micro_charge = (updatedSubscription  && updatedSubscription.try_micro_charge_in_next_cycle) ? updatedSubscription.try_micro_charge_in_next_cycle : false;
        history.user_id = user._id;
        history.subscription_id =  updatedSubscription ? updatedSubscription._id : subscription._id ;
        history.subscriber_id = subscription.subscriber_id;
        history.paywall_id = packageObj.paywall_id;
        history.package_id = packageObj._id;
        history.transaction_id = transaction_id;
        history.operator_response = response;
        history.price = packageObj.price_point_pkr;
        history.billing_status = "Success";
        history.operator = subscription.payment_source;
        await this.billingHistoryRepo.createBillingHistory(history);
    }

    async sendAffiliationCallback(tid, mid, user_id, subscription_id, subscriber_id, package_id, paywall_id) {
        let combinedId = tid + "*" +mid;
    
        let history = {};
        history.user_id = user_id;
        history.paywall_id = paywall_id;
        history.subscription_id = subscription_id;
        history.subscriber_id = subscriber_id;
        history.package_id = package_id;
        history.transaction_id = combinedId;
        history.operator = 'telenor';
    
        console.log(`Sending Affiliate Marketing Callback Having TID - ${tid} - MID ${mid}`);
        this.sendCallBackToIdeation(mid, tid).then(async (fulfilled) => {
            let updated = await this.subscriptionRepo.updateSubscription(subscription_id, {is_affiliation_callback_executed: true});
            if(updated){
                console.log(`Successfully Sent Affiliate Marketing Callback Having TID - ${tid} - MID ${mid} - Ideation Response - ${fulfilled}`);
                history.operator_response = fulfilled;
                history.billing_status = "Affiliate callback sent";
                await this.addHistory(history);
            }
        })
        .catch(async  (error) => {
            console.log(`Affiliate - Marketing - Callback - Error - Having TID - ${tid} - MID ${mid}`, error);
            history.operator_response = error.response.data;
            history.billing_status = "Affiliate callback error";
            await this.addHistory(history);
        });
    }

    async addHistory(history) {
        console.log("addHistory");
        console.log("addHistory: ", history);
        await this.billingHistoryRepo.createBillingHistory(history);
    }
    
    async sendCallBackToIdeation(mid, tid)  {
        var url; 
        if (mid === "1569") {
            url = config.ideation_callback_url + `p?mid=${mid}&tid=${tid}`;
        } else if (mid === "goonj"){
            url = config.ideation_callback_url2 + `?txid=${tid}`;
        } else if (mid === "aff3" || mid === "aff3a"){
            url = config.ideation_callback_url3 + `${tid}`;
        } else if (mid === "1" || mid === "gdn" ){
            return new Promise((resolve,reject) => { reject(null)})
        }
        console.log("url",url)
        return new Promise(function(resolve, reject) {
            axios({
                method: 'post',
                url: url,
                headers: {'Content-Type': 'application/x-www-form-urlencoded' }
            }).then(function(response){
                resolve(response.data);
            }).catch(function(err){
                reject(err);
            });
        });
    }
    
    async billingFailed (user, subscription, response, packageObj, transaction_id, first_time_billing)  {
     
        // Add history record
        let history = {};
        history.user_id = user._id;
        history.subscription_id = subscription._id;
        history.subscriber_id = subscription.subscriber_id;
        history.paywall_id = packageObj.paywall_id;
        history.package_id = packageObj._id;
        history.transaction_id = transaction_id;
        history.operator_response = response;
        history.billing_status = first_time_billing ? "direct-billing-tried-but-failed" : "switch-package-request-tried-but-failed";
        history.operator = subscription.payment_source;
        await this.billingHistoryRepo.createBillingHistory(history);
    }

    async linkTransaction (msisdn, amount, otp){
        try {
            console.log('linkTransaction: ', msisdn, amount, otp);
            let api_response = await this.easypaisaPaymentService.initiateLinkTransaction(msisdn, amount, otp);
            if(api_response && api_response.message === "success")
                return api_response.response.response.tokenNumber ? api_response.response.response.tokenNumber : undefined;
            else
                return undefined;
        }catch (e) {
            console.log('linkTransaction Err: ', e);
            return undefined
        }
    }
}

module.exports = PaymentProcessService;
