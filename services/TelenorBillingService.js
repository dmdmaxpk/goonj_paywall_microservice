const config = require('../config');

class TelenorBillingService {

    constructor({
        subscriptionRepository,billingHistoryRepository,
        tpsCountRepository,billingRepository, packageRepository,
        messageRepository,userRepository}){
            this.subscriptionRepo = subscriptionRepository;
            this.billingHistoryRepo = billingHistoryRepository;
            this.tpsCountRepo = tpsCountRepository;
            this.billingRepo = billingRepository;
            this.packageRepo = packageRepository;
            this.messageRepo = messageRepository;
            this.userRepo = userRepository;
    }

    async processDirectBilling(user, subscription, packageObj,first_time_billing) {
        let subscription_id = ""
        if (subscription._id) {
            subscription_id = subscription._id;
        } else {
            subscription_id = user._id;
        }
        let transaction_id = "GoonjDirectCharge_"+subscription_id+"_"+packageObj.price_point_pkr+"_"+this.getCurrentDate();

        let returnObj = {};

        try{
            // Check if the subscription is active or blocked for some reason.
            console.log("subscription-processDirectBilling",user.msisdn)
            if (subscription.active === true) {

                if (subscription.amount_billed_today < config.maximum_daily_payment_limit_pkr ) {
                    
                    let countThisSec = await this.tpsCountRepo.getTPSCount(config.queueNames.subscriptionDispatcher);
                    if (countThisSec < config.telenor_subscription_api_tps) {
                        
                        await this.tpsCountRepo.incrementTPSCount(config.queueNames.subscriptionDispatcher);
                        
                        try{
                            let response = await this.billingRepo.processDirectBilling(user.msisdn, packageObj, transaction_id);
                            console.log("response from billingRepo",response,user.msisdn);
                            let message = response.data.Message;
                            if(message === "Success"){
                                //Direct billing success, update records
                                await this.billingSuccess(user, subscription, response.data, packageObj,
                                      transaction_id,first_time_billing);
                                returnObj.message = "success";
                                returnObj.response = response.data;
                            }else{
                                await this.billingFailed(user, subscription, response.data, packageObj, transaction_id);
                                returnObj.message = "failed";
                                returnObj.response = response.data;
                            }
                            return returnObj;
                        }catch(error){
                            console.log("Error",error,user.msisdn);
                            returnObj.message = "failed";
                            if(error && error.response && error.response.data){
                                returnObj.response = error.response.data
                            }

                            if(error.response.data.errorCode === "500.007.08" || (error.response.data.errorCode === "500.007.05" &&
                            error.response.data.errorMessage === "Services of the same type cannot be processed at the same time.")){
                                returnObj.noAck = true;
                            }else{
                                //consider payment failed
                                await this.billingFailed(user, subscription, error.response.data, packageObj, transaction_id);
                            }
                            return returnObj;
                        }       
                    } else{
                        console.log("TPS quota full for subscription, waiting for second to elapse - ", new Date());
                        setTimeout(() => {
                            console.log("Calling consume subscription queue after 300 seconds");
                            this.processDirectBilling(user, subscription, packageObj);
                        }, 300);
                    }  
                }else{
                    returnObj.shootExcessiveBillingEmail = true;
                    return returnObj;
                }
            }
        }catch(error){
            console.log(error);
            return returnObj;
        }
    }


    async billingSuccess (user, subscription, response, packageObj, transaction_id,first_time_billing)  {
        
        // Success billing
        let nextBilling = new Date();
        nextBilling.setHours(nextBilling.getHours() + packageObj.package_duration);
    
        let subscriptionCreated = undefined;
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
            console.log("subscriptionCreated",subscriptionCreated,user.msisdn);
            subscriptionCreated = await this.subscriptionRepo.createSubscription(subscription);
        }
        console.log("subscriptionCreated",subscriptionCreated);
        // Add history record
        let history = {};
        history.user_id = user._id;
        history.subscription_id =  subscriptionCreated?subscriptionCreated._id:subscription._id ;
        history.subscriber_id = subscription.subscriber_id;
        history.paywall_id = packageObj.paywall_id;
        history.package_id = packageObj._id;
        history.transaction_id = transaction_id;
        history.operator_response = response;
        history.price = packageObj.price_point_pkr;
        history.billing_status = "Success";
        history.operator = 'telenor';
        await this.billingHistoryRepo.createBillingHistory(history);
    }
    
    async billingFailed   (user, subscription, response, packageObj, transaction_id)  {
        // Add history record
        let history = {};
        history.user_id = user._id;
        history.subscription_id = subscription._id;
        history.subscriber_id = subscription.subscriber_id;
        history.paywall_id = packageObj.paywall_id;
        history.package_id = packageObj._id;
        history.transaction_id = transaction_id;
        history.operator_response = response;
        history.billing_status = "switch-package-request-tried-but-failed";
        history.operator = 'telenor';
        await this.billingHistoryRepo.createBillingHistory(history);
    }

    // Helper functions
    getCurrentDate() {
        var now = new Date();
        var strDateTime = [
            [now.getFullYear(),
                this.AddZero(now.getMonth() + 1),
                this.AddZero(now.getDate())].join("-"),
            [this.AddZero(now.getHours()),
                this.AddZero(now.getMinutes())].join(":")];
        return strDateTime;
    }

    AddZero(num) {
        return (num >= 0 && num < 10) ? "0" + num : num + "";
    }
}

module.exports = TelenorBillingService;