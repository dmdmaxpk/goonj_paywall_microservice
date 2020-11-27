const container = require("../configurations/container");
const billingHistoryRepo = container.resolve("billingHistoryRepository");
const userRepo = container.resolve("userRepository");
const config = require('../config');
const shortId = require('shortid');
const subscriptionRepo = container.resolve("subscriptionRepository");
const packageRepo = container.resolve("packageRepository");
const moment = require('moment');
const { resolve } = require("../configurations/container");
const emailService = container.resolve("emailService");


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

addSubscription =  async(subscription) => {
    let promise = getPromise(subscription);
    promise.then(response => {
        console.log(subscription._id, 'response', response);
    }).catch(error => {
        console.log(subscription._id, 'error', error);
    });
}

getPromise =  async(subscription) => {
    return new Promise((resolve, reject) => {
        renewSubscription(subscription);
        resolve('-Done-');
    });
} 


// Expire users
expire = async(subscription) => {
    await subscriptionRepo.updateSubscription(subscription._id, {
        subscription_status: 'expired', 
        is_allowed_to_stream:false, 
        is_billable_in_this_cycle:false, 
        consecutive_successive_bill_counts: 0,
        try_micro_charge_in_next_cycle: false,
        micro_price_point: 0,
        amount_billed_today: 0
    });

    let packageObj = await packageRepo.getPackage({_id: subscription.subscribed_package_id});
    let user = await userRepo.getUserBySubscriptionId(subscription._id);

    let history = {};
    history.user_id = user._id;
    history.subscriber_id = subscription.subscriber_id;
    history.subscription_id = subscription._id;
    history.package_id = subscription.subscribed_package_id;
    history.paywall_id = packageObj.paywall_id;
    history.transaction_id = undefined;
    history.operator_response = undefined;
    history.billing_status = 'expired';
    history.source = 'system';
    history.operator = 'telenor';

    await billingHistoryRepo.createBillingHistory(history);
}

renewSubscription = async(subscription) => {
    let transactionId;
    let mcDetails = {};

    if(subscription.try_micro_charge_in_next_cycle === true && subscription.micro_price_point > 0){
        if(subscription.payment_source === 'easypaisa'){
            transactionId = "GEP-MC_"+shortId.generate();
        }else{
            transactionId = "GoonjMicroCharge_" + subscription._id + "_Price_" + subscription.micro_price_point + "_" + shortId.generate() + "_" + getCurrentDate();
        }
        mcDetails.micro_charge = true;
        mcDetails.micro_price = subscription.micro_price_point;
    }else{
        mcDetails.micro_charge = false;
        if(subscription.payment_source === 'easypaisa'){
            transactionId = "G-EP_"+shortId.generate();
        }else{
            transactionId = "GoonjFullCharge_"+subscription._id+"_"+shortId.generate()+"_"+getCurrentDate();
        }
    }

    // Add object in queueing server
    if(subscription.queued === false){
        let package = await packageRepo.getPackage({_id: subscription.subscribed_package_id});
        subscriptionRepo.updateSubscription(subscription._id, {queued: true});

        let user = await userRepo.getUserBySubscriberId(subscription.subscriber_id);
        if(user){
            let messageObj = {};
            messageObj.user = user;
            messageObj.package = package;
            messageObj.subscription = subscription;
            messageObj.mcDetails = mcDetails;
            messageObj.transaction_id = transactionId;
            messageObj.method_type = 'renewSubscription';
            messageObj.returnObject = {};
            rabbitMq.addInQueue(config.queueNames.subscriptionDispatcher, messageObj);
            console.log('Added: ', subscription._id);
            return;
        }else{
            console.log('No user exist for subscription id ', subscription._id);
        }
        
    }else{
        console.log("The subscription", subscription._id, " is already queued");
    }
}

markRenewableUser = async() => {
    try {
        let now = moment().tz("Asia/Karachi");
        let hour = now.hours();
        if (config.hours_on_which_to_run_renewal_cycle.includes(hour)) {
            console.log("Executing cycle at ",hour," hour");
            await mark(0);
            validate();
        } else {
            console.log("No renewable cycle for the hour",hour);
        }
    } catch(err) {
        console.error(err);
    }
}

markRenewableUserForcefully = async() => {
    try {
        mark();
    } catch(err) {
        console.error(err);
    }
}

mark = async() => {
    let totalCount = await subscriptionRepo.getCountOfSubscriptionToMark();
    console.log("==> Total count "+totalCount);

    let chunkSize = 10000;
    let totalChunks = totalCount / chunkSize;
    let reminders = totalCount % chunkSize;
    console.log("==> Total chunks "+totalChunks+" - total reminders "+reminders);

    let lastId = undefined;
    for(let i = 0; i < totalChunks; i++){
        try{
            let response = await getMarkUsersPromise(chunkSize, lastId);
            lastId = response;
            console.log("==>",i,' - ', response);
        }catch(e){
            console.log("==>",i, ' error - ', e);
        }
    }

    //Reminders
    let response = await getMarkUsersPromise(reminders, lastId);
    console.log("==> reminder", response);
    console.log("==> Done!");
}

validate = async() => {
    console.log("==> validating...");

    let countThreshold = 400000;
    let totalCount = await subscriptionRepo.getBillableInCycleCount();
    console.log("==> Total billable in cycle count is " + totalCount);

    if(totalCount < countThreshold){
        let subject = 'Billing Cycle Count Lower Than Expected';
        let text = `Total billable cycle count is ${totalCount}, which is lower than threshold ${countThreshold}. Please check as soon as possible!`
        let email= ['paywall@dmdmax.com.pk', 'mikaeel@dmdmax.com', 'usama.shamim@dmdmax.com'];
        emailService.sendEmail(subject, text, email);
        console.log('==> Email alert Sent!');
    }
    else{
        console.log('==> Total billable cycle count seems alright!');
    }
}

getMarkUsersPromise = (limit, lastId) =>{
    return new Promise(async(resolve, reject) => {
        let subscription_ids  = await subscriptionRepo.getSubscriptionsToMarkWithLimitAndOffset(limit, lastId);
        //console.log("==> Length: ", subscription_ids.length);
        if(subscription_ids && subscription_ids.length > 0){
            await subscriptionRepo.setAsBillableInNextCycle(subscription_ids);
            resolve(subscription_ids[subscription_ids.length-1]);
        }else{
            console.log("Failed to mark, length is "+subscription_ids.length);
            resolve(undefined);
        }
    });
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
    markRenewableUser: markRenewableUser,
    markRenewableUserForcefully: markRenewableUserForcefully,
    addSubscription: addSubscription
}
