const container = require("../configurations/container");
const CronJob = require('cron').CronJob;
const subsriberRepo = container.resolve("subscriberRepository");
const packageRepo = container.resolve("packageRepository");
const billingHistoryRepo = container.resolve("billingHistoryRepository");
const userRepo = container.resolve("userRepository");
const config = require('../config');
const shortId = require('shortid');
const chargeAttemptRepo = container.resolve("chargingAttemptRepository");
const moment = require('moment');

const subscriptionRepo = container.resolve("subscriptionRepository");


subscriptionRenewal = async() => {
    try {
        let subscriptions = await subscriptionRepo.getRenewableSubscriptions();
        let subscriptionToRenew = [];
        let subscriptionNotToRenew = [];

        for(let i = 0; i < subscriptions.length; i++){
            if(subscriptions[i].auto_renewal === false){
                subscriptionNotToRenew = [...subscriptionNotToRenew, subscriptions[i] ];
            }else {
                subscriptionToRenew = [...subscriptionToRenew, subscriptions[i] ];
            }
        }
        
        for(let i = 0; i < subscriptionNotToRenew.length; i++) {
            let subs = subscriptionNotToRenew[i];
            await expire(subs);
        }

        let promisesArr = [];
        console.log("Subscribers to renew -> ", subscriptionToRenew.length);

        for(let i = 0; i < subscriptionToRenew.length; i++){
            let promise = getPromise(subscriptionToRenew[i]);
            promisesArr.push(promise);
        }
        await Promise.all(promisesArr);
    } catch(err){
        console.log(err);
    }
}

getPromise =  async(subscription) => {
    return new Promise((resolve, reject) => {
        renewSubscription(subscription);
        resolve('-Done-');
    });
} 


// Expire users
expire = async(subscription) => {
    await subscriptionRepo.updateSubscription(subscription._id, {subscription_status: 'expired', is_allowed_to_stream:false, is_billable_in_this_cycle:false, consecutive_successive_bill_counts: 0});
    let user = await userRepo.getUserBySubscriptionId(subscription._id);

    let history = {};
    history.user_id = user._id;
    history.subscriber_id = subscription.subscriber_id;
    history.subscription_id = subscription._id;
    history.package_id = user.subscribed_package_id;
    history.transaction_id = undefined;
    history.operator_response = undefined;
    history.billing_status = 'expired';
    history.source = 'system';
    history.operator = 'telenor';

    let attempt = await chargeAttemptRepo.getAttempt(subscription._id);
    if(attempt && attempt.active === true){
        await chargeAttemptRepo.updateAttempt(subscription._id, {active: false});
    }
    await billingHistoryRepo.createBillingHistory(history);
}

renewSubscription = async(subscription) => {
    
    let chargeAttempt = await chargeAttemptRepo.getAttempt(subscription._id);
    
    let transactionId;
    
    let subscriptionObj = {};
    subscriptionObj.subscription = subscription;
    
    if(chargeAttempt && chargeAttempt.queued === false && chargeAttempt.active === true && chargeAttempt.number_of_attempts_today >= 2){
        await chargeAttemptRepo.queue(subscription._id);
        transactionId = "GoonjMicroCharge_" + subscription._id + "_Price_" + chargeAttempt.price_to_charge + "_" + shortId.generate() + "_" + getCurrentDate();
        subscriptionObj.attemp_id = chargeAttempt._id;
        subscriptionObj.micro_charge = true;
        subscriptionObj.micro_price = chargeAttempt.price_to_charge;
    }else{
        if (subscription.is_discounted === true && subscription.discounted_price){ 
            subscriptionObj.discount = true;
            subscriptionObj.discounted_price = subscription.discounted_price;
            transactionId = "GoonjDiscountedCharge_"+subscription._id+"_"+shortId.generate()+"_"+getCurrentDate();
        }else{
            transactionId = "GoonjFullCharge_"+subscription._id+"_"+shortId.generate()+"_"+getCurrentDate();
        }
    }
    subscriptionObj.transaction_id = transactionId;

    // Add object in queueing server
    if(subscription.queued === false){
        let updated = await subscriptionRepo.updateSubscription(subscription._id, {queued: true});
        if(updated){
            rabbitMq.addInQueue(config.queueNames.subscriptionDispatcher, subscriptionObj);
            
            if(subscriptionObj.micro_charge){
                console.log('Renew Subscription Micro Charge - AddInQueue', ' - ', transactionId, ' - ', (new Date()));    
            }else if(subscriptionObj.discount){
                console.log('Discounted Subscription - AddInQueue', ' - ', transactionId, ' - ', (new Date()));
            }else{
                console.log('Renew Full Subscription - AddInQueue', ' - ', transactionId, ' - ', (new Date()));
            }
        }else{
            console.log('Failed to updated subscription after adding in queue.');
        }
    }else{
        console.log("The subscription", subscription._id, " is already queued");
    }
}

markRenewableUser = async() => {
    try {
        let now = moment().tz("Asia/Karachi");
        console.log("Get Hours",now.hours());
        let hour = now.hours();
        
        if (config.hours_on_which_to_run_renewal_cycle.includes(hour)) {
            console.log("Running renewal cycle: ", hour);

            let subscription_ids  = await subscriptionRepo.getSubscriptionsToMark();
            console.log("Number of subscription in this cycle: ", subscription_ids.length);
            await subscriptionRepo.setAsBillableInNextCycle(subscription_ids);
        } else {
            console.log("Not running renewal cycle this hour: ", hour);
        }
    } catch(err) {
        console.error(err);
    }
}

















// Helper functions
function getCurrentDate() {
    var now = new Date();
    var strDateTime = [
        [now.getFullYear(),
            AddZero(now.getMonth() + 1),
            AddZero(now.getDate())].join("-"),
        [AddZero(now.getHours()),
            AddZero(now.getMinutes())].join(":")];
    return strDateTime;
}

function AddZero(num) {
    return (num >= 0 && num < 10) ? "0" + num : num + "";
}

module.exports = {
    // runJob: runJob,
    subscriptionRenewal: subscriptionRenewal,
    markRenewableUser: markRenewableUser
}
