const config = require('../../../config');

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

    async processDirectBilling(user, subscription, packageObj) {
        let transaction_id = "GoonjDirectCharge_"+subscription._id+"_"+packageObj.price_point_pkr+"_"+getCurrentDate();

        let returnObj = {};

        try{
            // Check if the subscription is active or blocked for some reason.
            if (subscription.active === true) {

                if (subscription.amount_billed_today < config.maximum_daily_payment_limit_pkr ) {
                    
                    let countThisSec = await this.tpsCountRepo.getTPSCount(config.queueNames.subscriptionDispatcher);
                    if (countThisSec < config.telenor_subscription_api_tps) {
                        
                        await this.tpsCountRepo.incrementTPSCount(config.queueNames.subscriptionDispatcher);
                        
                        try{
                            let response = await this.billingRepo.processDirectBilling(user.msisdn, packageObj, transaction_id);
                            let message = response.data.Message;
                            if(message === "Success"){
                                //Direct billing success, update records
                                await billingSuccess(user, subscription, response.data, packageObj, transaction_id);
                                returnObj.message = "success";
                                returnObj.response = response.data;
                            }else{
                                await billingFailed(user, subscription, response.data, packageObj, transaction_id);
                                returnObj.message = "failed";
                                returnObj.response = response.data;
                            }
                            return returnObj;
                        }catch(error){
                            returnObj.message = "failed";
                            if(error && error.response.data){
                                returnObj.response = error.response.data
                            }

                            if(error && error.response && error.response.data.errorCode === "500.007.08"){
                                returnObj.noAck = true;
                            }else{
                                //consider payment failed
                                await billingFailed(user, subscription, error.response.data, packageObj, transaction_id);
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


    billingSuccess = async(user, subscription, response, packageObj, transaction_id) => {
	
        // Success billing
        let nextBilling = new Date();
        nextBilling.setHours(nextBilling.getHours() + packageObj.package_duration);
    
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
        await subscriptionRepo.updateSubscription(subscription._id, subscriptionObj);
    
        // Add history record
        let history = {};
        history.user_id = user._id;
        history.subscription_id = subscription._id;
        history.subscriber_id = subscription.subscriber_id;
        history.paywall_id = packageObj.paywall_id;
        history.package_id = packageObj._id;
        history.transaction_id = transaction_id;
        history.operator_response = response;
        history.billing_status = "Success";
        history.operator = 'telenor';
        await this.billingHistoryRepo.createBillingHistory(history);
    }
    
    billingFailed =  async(user, subscription, response, packageObj, transaction_id) => {
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
                AddZero(now.getMonth() + 1),
                AddZero(now.getDate())].join("-"),
            [AddZero(now.getHours()),
                AddZero(now.getMinutes())].join(":")];
        return strDateTime;
    }

    AddZero(num) {
        return (num >= 0 && num < 10) ? "0" + num : num + "";
    }
}