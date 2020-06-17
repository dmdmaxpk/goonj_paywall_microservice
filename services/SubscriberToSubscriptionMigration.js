const container = require("../configurations/container");
const billingHistoryRepo = container.resolve("billingHistoryRepository");
const subscriberRepo = container.resolve("subscriberRepository");
const subscriptionRepo = container.resolve("subscriptionRepository");
const packageRepo = container.resolve("packageRepository");
const migrationRepo = container.resolve("migrationRepository");
const userRepo = container.resolve("userRepository");

execute = async(req,res) => {
    res.send("Executing migration script")
    let skip = 90000;
    let limit = 10000;


    let totalCount = await subscriberRepo.getCount();
    let totalChunks = Math.trunc(totalCount / limit);
    let leftOver = totalCount % limit;

    console.log("Total counts", totalCount, "Total chunks", totalChunks, "Leftover", leftOver);
    for(i = 0; i < totalChunks; i++){
        console.log("Skipping", skip, "records");
        console.time("getSubscribers");
        let subscribers = await subscriberRepo.getAllSubscribers(limit, skip);
        console.timeEnd("getSubscribers");
        console.time("processSubcribers");
        processSubscribers(subscribers);
        console.timeEnd("processSubcribers");
        skip+=limit;
        // await sleep(2*1000);
    }

    console.log("Skipping", skip);
    let subscribers = await subscriberRepo.getAllSubscribers(leftOver, skip);
    console.log("Leftover length: ", subscribers.length);
    processSubscribers(subscribers);
}

processSubscribers = async(subscribers) => {
    
    let promises = [];
    for(j = 0; j < subscribers.length; j++){
        let promise = createSubscription(subscribers[j]);
        promises.push(promise);
    }

    try{
        console.time("executePromiseAll");
        let response = await Promise.all(promises);
        console.timeEnd("executePromiseAll");
        console.log("TryData Length", response.length);
        console.log("\n-------------------------------\n\n");
    }catch(err){
        console.log("CatchData", err);
        console.log("\n-------------------------------\n\n");
    }
}

createSubscription = (subscriber) => {
    return new Promise(async(resolve, reject) => {
    
    try {
        let user = await userRepo.getUserById(subscriber.user_id);

        if(user && (user.subscribed_package_id === "QDfC" || user.subscribed_package_id === "QDfE")){
            let resolveMessage = {};
            let subscriptionObj = {};
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

            let added = await subscriptionRepo.createSubscription(subscriptionObj);
            if(added){
                    resolveMessage.migration_message = "success";
                    resolveMessage.subscriber_id = subscriber._id;

                    // Lets create history
                    if (user.subscribed_package_id !== "QDfC"){
                        console.log("user.subscribed_package_id",user.subscribed_package_id)
                    }
                    if (user.subscribed_package_id) {
                        let packageObj = await packageRepo.getPackage({_id: user.subscribed_package_id});
                        let history = {};
                        history.user_id = user._id;
                        history.subscriber_id = subscriber._id;
                        history.subscription_id = added._id;
                        history.package_id = user.subscribed_package_id;
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
                    } else {
                        console.log("User does not have pacakge id",user._id);
                        resolve(`User does not have pacakge id ${user._id}`);
                    }
             
            }   else    {
                let rejectMessage = {};
                rejectMessage.rejection_message = "failed";
                rejectMessage.subscriber_id = subscriber._id;
                await migrationRepo.createMigration(rejectMessage);
                reject(rejectMessage);
            }
        }else{
            console.log("user_with_no_pacakge_id",user._id);
            let resolveMessage = {};
            resolveMessage.migration_message = "no_user_found";
            resolveMessage.subscriber_id = subscriber._id;
            await migrationRepo.createMigration(resolveMessage);
            resolve(resolveMessage);
        }
    } catch(err) {
        reject(err);
    }
        

        
    });
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    execute: execute
}