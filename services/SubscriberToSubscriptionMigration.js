const container = require("../configurations/container");
const billingHistoryRepo = container.resolve("billingHistoryRepository");
const subscriberRepo = container.resolve("subscriberRepository");
const subscriptionRepo = container.resolve("subscriptionRepository");
const packageRepo = container.resolve("packageRepository");
const migrationRepo = container.resolve("migrationRepository");

execute = async() => {
    let subscribers = await subscriberRepo.getAllSubscribers();
    
    let promises = [];
    for(i = 0; i < subscribers.length; i++){
        let promise = createSubscription(subscribers[i]);
        promises.push(promise);
    }

    let tryData;
    let catchData = [];

    try{
        let response = await Promise.all(promises);
        tryData.push(response);
    }catch(err){
        catchData.push(err);
    }

    console.log(tryData);
    console.log(catchData);
}

createSubscription = (subscriber) => {
    return new Promise(async(resolve, reject) => {

        let resolveMessage = {};

        let subscriptionObj = {};
        subscriptionObj.subscriber_id = subscriber._id;
        subscriptionObj.subscription_status = subscriber.subscription_status;
        subscriptionObj.last_billing_timestamp = subscriber.last_billing_timestamp;
        subscriptionObj.next_billing_timestamp = subscriber.next_billing_timestamp;
        subscriptionObj.auto_renewal = subscriber.auto_renewal;
        subscriptionObj.total_successive_bill_counts = subscriber.total_successive_bill_counts;
        subscriptionObj.consecutive_successive_bill_counts = subscriber.consecutive_successive_bill_counts;
        subscriptionObj.source = subscriber.source;
        subscriptionObj.marketing_source = subscriber.marketing_source;
        subscriptionObj.affiliate_unique_transaction_id = subscriber.affiliate_unique_transaction_id;
        subscriptionObj.affiliate_mid = subscriber.affiliate_mid;
        subscriptionObj.is_affiliation_callback_executed = subscriber.is_affiliation_callback_executed;
        subscriptionObj.added_dtm = subscriber.added_dtm;
        subscriptionObj.is_discounted = subscriber.is_discounted;
        subscriptionObj.discounted_price = subscriber.discounted_price,
        subscriptionObj.queued = subscriber.queued;
        subscriptionObj.is_allowed_to_stream = subscriber.is_allowed_to_stream;
        subscriptionObj.is_billable_in_this_cycle = subscriber.is_billable_in_this_cycle;
        subscriptionObj.date_on_which_user_entered_grace_period = subscriber.date_on_which_user_entered_grace_period;
        subscriptionObj.subscribed_package_id = subscriber.subscribed_package_id;
        subscriptionObj.amount_billed_today = subscriber.amount_billed_today;
        subscriptionObj.is_manual_recharge = false;
        subscriptionObj.active = subscriber.active;

        let added = await subscriptionRepo.createSubscription(subscriptionObj);
        if(added){
            resolveMessage.migration_message = "success";
            resolveMessage.subscriber_id = subscriber._id;

            // Lets create history
            let packageObj = await packageRepo.getPackage({_id: subscriber.subscribed_package_id});
            let history = {};
            history.user_id = subscriber.user_id;
            history.subscriber_id = subscriber._id;
            history.subscription_id = subscription._id;
            history.package_id = subscriber.subscribed_package_id;
            history.paywall_id = packageObj.paywall_id;
            history.billing_status = "subscriber-migrated-to-subscription";
            history.source = "system";

            added = await billingHistoryRepo.createBillingHistory(history);
            if(added){
                resolveMessage.history_message = "success";
                resolveMessage.history_id = added._id;
            }else{
                resolveMessage.history_message = "failed";
            }
            await migrationRepo.createMigration(resolveMessage);
            resolve(resolveMessage);
        }else{
            let rejectMessage = {};
            rejectMessage.rejection_message = "failed";
            rejectMessage.subscriber_id = subscriber._id;
            await migrationRepo.createMigration(rejectMessage);
            reject(rejectMessage);
        }
    });
}

module.exports = {
    execute: execute
}