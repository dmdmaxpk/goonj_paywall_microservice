const config = require('../config');
const axios =require("axios");

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

    async processDirectBilling(user, subscription, packageObj, first_time_billing) {
        return new Promise( async (resolve,reject) => {
            let subscription_id = "";
            if (subscription._id) {
                subscription_id = subscription._id;
            } else {
                subscription_id = user._id;
            }
            let transaction_id = "GoonjDirectCharge_"+subscription_id+"_"+packageObj.price_point_pkr+"_"+this.getCurrentDate();
            let returnObj = {};

            try{
                // Check if the subscription is active or blocked for some reason.
                console.log("processing direct billing - first time billing",first_time_billing,user.msisdn)
                if (subscription.active === true) {
                    if (subscription.amount_billed_today < config.maximum_daily_payment_limit_pkr ) {
                        let countThisSec = await this.tpsCountRepo.getTPSCount(config.queueNames.subscriptionDispatcher);
                        if (countThisSec < config.telenor_subscription_api_tps) {
                            await this.tpsCountRepo.incrementTPSCount(config.queueNames.subscriptionDispatcher);
                            
                            try{
                                let response = await this.billingRepo.processDirectBilling(user.msisdn, packageObj, transaction_id);
                                console.log("response from billingRepo",response.data);
                                let message = response.data.Message;
                                if(message === "Success"){
                                    //Direct billing success, update records
                                    await this.billingSuccess(user, subscription, response.data, packageObj,
                                                                    transaction_id,first_time_billing);
                                    returnObj.message = "success";
                                    returnObj.response = response.data;
                                }else{
                                    await this.billingFailed(user, subscription, response.data, packageObj, transaction_id, first_time_billing);
                                    returnObj.message = "failed";
                                    returnObj.response = response.data;
                                }
                                resolve(returnObj);
                            }catch(error){
                                console.log("Error message", error.message, user.msisdn);
                                returnObj.message = "failed";
                                if(error && error.response && error.response.data){
                                    returnObj.response = error.response.data
                                }

                                if(error && error.response && error.response.data && (error.response.data.errorCode === "500.007.08" || (error.response.data.errorCode === "500.007.05" &&
                                error.response.data.errorMessage === "Services of the same type cannot be processed at the same time."))){
                                    returnObj.noAck = true;
                                }else{
                                    //consider payment failed
                                    await this.billingFailed(user, subscription, error.response.data, packageObj, transaction_id, first_time_billing);
                                }
                                resolve(returnObj);
                            }       
                        } else{
                            console.log("TPS quota full for subscription, waiting for second to elapse - ", new Date());
                            setTimeout(async () => {
                                console.log("Calling consume subscription queue after 300 seconds",user.msisdn);
                                let response = await this.processDirectBilling(user, subscription, packageObj,first_time_billing);
                                resolve(response);
                            }, 300);
                        }  
                    }else{
                        returnObj.shootExcessiveBillingEmail = true;
                        resolve(returnObj);
                    }
                }
            }catch(error){
                console.log(error);
                resolve(returnObj);
            }
        });
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
            await this.subscriptionRepo.updateSubscription(subscription._id, subscriptionObj);
        } else {
            console.log("subscription created",user.msisdn);
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
            console.log("subscription created", updatedSubscription);

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
        console.log("Adding history record",user.msisdn);
        let history = {};
        history.micro_charge = subscription.try_micro_charge_in_next_cycle ? subscription.try_micro_charge_in_next_cycle : false;
        history.user_id = user._id;
        history.subscription_id =  updatedSubscription ? updatedSubscription._id : subscription._id ;
        history.subscriber_id = subscription.subscriber_id;
        history.paywall_id = packageObj.paywall_id;
        history.package_id = packageObj._id;
        history.transaction_id = transaction_id;
        history.operator_response = response;
        history.price = packageObj.price_point_pkr;
        history.billing_status = "Success";
        history.operator = 'telenor';
        await this.billingHistoryRepo.createBillingHistory(history);
        console.log("Added history record",user.msisdn);
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
        await this.billingHistoryRepo.createBillingHistory(history);
    }
    
    async sendCallBackToIdeation(mid, tid)  {
        var url; 
        if (mid === "1569") {
            url = config.ideation_callback_url + `p?mid=${mid}&tid=${tid}`;
        } else if (mid === "goonj"){
            url = config.ideation_callback_url2 + `?txid=${tid}`;
        } else if (mid === "aff3"){
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
        history.micro_charge = subscription.try_micro_charge_in_next_cycle ? subscription.try_micro_charge_in_next_cycle : false;
        history.price = subscription.micro_price_point ? subscription.micro_price_point : 0;
        history.user_id = user._id;
        history.subscription_id = subscription._id;
        history.subscriber_id = subscription.subscriber_id;
        history.paywall_id = packageObj.paywall_id;
        history.package_id = packageObj._id;
        history.transaction_id = transaction_id;
        history.operator_response = response;
        history.billing_status = first_time_billing ? (subscription.try_micro_charge_in_next_cycle === true ? "direct-micro-charge-tried-but-failed" : "direct-billing-tried-but-failed") : "switch-package-request-tried-but-failed";
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