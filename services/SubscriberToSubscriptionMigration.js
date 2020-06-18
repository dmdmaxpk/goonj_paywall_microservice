const container = require("../configurations/container");
const billingHistoryRepo = container.resolve("billingHistoryRepository");
const subscriberRepo = container.resolve("subscriberRepository");
const subscriptionRepo = container.resolve("subscriptionRepository");
const packageRepo = container.resolve("packageRepository");
const migrationRepo = container.resolve("migrationRepository");
const userRepo = container.resolve("userRepository");
const mongoose = require('mongoose');
const Subscription = mongoose.model('Subscription');
const shortId = require('shortid');

execute = async(req,res) => {
    res.send("Executing migration script");
    let skip = 0;
    let limit = 5000;


    let totalCount = (await subscriberRepo.getCount() - skip);
    let totalChunks = Math.trunc(totalCount / limit);
    let leftOver = totalCount % limit;

    console.log("Total counts", totalCount, "Total chunks", totalChunks, "Leftover", leftOver);
    let query = {};
    let added_dtm_gt = new Date("2020-01-01T00:00:00.105Z");

    for(i = 0; i < totalChunks; i++){
        query = {added_dtm: { $gt: added_dtm_gt }};
        let subscribers = await subscriberRepo.getAllSubscribers(query,limit);
        added_dtm_gt = subscribers[limit-1].added_dtm;
        console.time("bulkWriteTimeTaken");
        await processSubscribers(subscribers);
        console.timeEnd("bulkWriteTimeTaken");
        skip+=limit;
        await sleep(100);
    }
    console.log("leftOver query",query);
    console.log("Skipping leftover");
    query = {added_dtm: { $gt: added_dtm_gt }};
    let subscribers = await subscriberRepo.getAllSubscribers(query,limit);
    console.time("bulkWriteTimeTaken");
    await processSubscribers(subscribers);
    console.timeEnd("bulkWriteTimeTaken");
    console.log("total_subscribers_not_added",total_subscribers_not_added);
    console.log("graced_not_added",graced_not_added);
    console.log("billed_not_added",billed_not_added);
    console.log("trialled_not_added",trialled_not_added);
    console.log("expired_not_added",expired_not_added);
    console.log("other_not_added",other_not_added);
}

processSubscribers = async(subscribers) => {
    let bulkSubscriptions = [];
    for(j = 0; j < subscribers.length; j++){
        let sub = await createSubscription(subscribers[j]);
        if (sub){
            bulkSubscriptions.push(sub);
        }
    }
    try {
        console.log("Bulk insert length: ", bulkSubscriptions.length);
        console.time("insertManyasd");
        await subscriptionRepo.insertMany(bulkSubscriptions);
        console.time("insertManyasd");
    } catch(err){
        console.error(err);
    }
}

var total_subscribers_not_added = 0;
var graced_not_added = 0;
var billed_not_added = 0;
var trialled_not_added = 0;
var expired_not_added = 0;
var other_not_added = 0;
createSubscription = async (subscriber) => {
    let subscriptionObj = new Subscription();
    let user = await userRepo.getUserById(subscriber.user_id);
    if(user && (user.subscribed_package_id === "QDfC")){
        subscriptionObj._id = shortId.generate() ;
        subscriptionObj.subscriber_id = subscriber._id;
        subscriptionObj.subscription_status = subscriber.subscription_status;
        subscriptionObj.last_billing_timestamp = subscriber.last_billing_timestamp;
        subscriptionObj.next_billing_timestamp = subscriber.next_billing_timestamp;
        subscriptionObj.auto_renewal = subscriber.auto_renewal;
        subscriptionObj.total_successive_bill_counts = subscriber.total_successive_bill_counts ? subscriber.total_successive_bill_counts: 0;
        subscriptionObj.consecutive_successive_bill_counts = subscriber.consecutive_successive_bill_counts ? subscriber.consecutive_successive_bill_counts : 0;
        subscriptionObj.source = user.source ? user.source : "na";
        subscriptionObj.marketing_source = user.marketing_source;
        subscriptionObj.affiliate_unique_transaction_id = user.affiliate_unique_transaction_id;
        subscriptionObj.affiliate_mid = user.affiliate_mid;
        subscriptionObj.is_affiliation_callback_executed = user.is_affiliation_callback_executed;
        subscriptionObj.is_gray_listed = user.is_gray_listed;
        subscriptionObj.is_black_listed = user.is_black_listed;
        subscriptionObj.added_dtm = subscriber.added_dtm;
        subscriptionObj.is_discounted = subscriber.is_discounted;
        subscriptionObj.discounted_price = subscriber.discounted_price;
        subscriptionObj.queued = subscriber.queued;
        subscriptionObj.is_allowed_to_stream = subscriber.is_allowed_to_stream;
        subscriptionObj.is_billable_in_this_cycle = subscriber.is_billable_in_this_cycle;
        subscriptionObj.date_on_which_user_entered_grace_period = subscriber.date_on_which_user_entered_grace_period;
        subscriptionObj.subscribed_package_id = user.subscribed_package_id;
        subscriptionObj.amount_billed_today = subscriber.amount_billed_today;
        subscriptionObj.is_manual_recharge = false;
        subscriptionObj.active = subscriber.active;
        subscriptionObj.paywall_id = "ghRtjhT7"; // TODO HArdCode this id for now

        // let added = await subscriptionRepo.createSubscription(subscriptionObj);
        // if(added){
        //         resolveMessage.migration_message = "success";
        //         resolveMessage.subscriber_id = subscriber._id;

        //         if (user.subscribed_package_id) {
        //             //let packageObj = await packageRepo.getPackage({_id: user.subscribed_package_id});
        //             // let history = {};
        //             // history.user_id = user._id;
        //             // history.subscriber_id = subscriber._id;
        //             // history.subscription_id = added._id;
        //             // history.package_id = "QDfC";
        //             // history.paywall_id = "ghRtjhT7";
        //             // history.billing_status = "subscriber-migrated-to-subscription";
        //             // history.source = "system";

        //             console.log("storeHistory", user._id, added._id);
    
        //             // added = await billingHistoryRepo.createBillingHistory(history);
        //             // if(added){
        //             //     resolveMessage.history_message = "success";
        //             //     resolveMessage.history_id = added._id;
        //             // }else{
        //             //     resolveMessage.history_message = "failed";
        //             // }
        //             // await migrationRepo.createMigration(resolveMessage);
        //             resolve(resolveMessage);
        //         } else {
        //             console.log("User does not have pacakge id",user._id);
        //             resolve(`User does not have pacakge id ${user._id}`);
        //         }
            
        // }   else    {
        //     let rejectMessage = {};
        //     rejectMessage.rejection_message = "failed";
        //     rejectMessage.subscriber_id = subscriber._id;
        //     await migrationRepo.createMigration(rejectMessage);
        //     reject(rejectMessage);
        // }
        // console.log("subscriber added",subscriber._id)
        return subscriptionObj;
    } else {
        total_subscribers_not_added++;
        if (subscriber.subscription_status === "billed"){
            billed_not_added++;
        } else if (subscriber.subscription_status === "graced"){
            graced_not_added++;
        } else if (subscriber.subscription_status === "trial"){
            trialled_not_added++;
        } else if (subscriber.subscription_status === "expired"){
            expired_not_added++;
        } else{
            other_not_added++;
        }


        console.log("----------------")
        console.log("subscriber not added",subscriber._id);
        console.log("----------------")
        return undefined;
    }
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    execute: execute
}