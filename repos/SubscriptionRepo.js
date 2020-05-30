const mongoose = require('mongoose');
const Subscription = mongoose.model('Subscription');
const moment = require("moment");

createSubscription = async(postData) => {
    let subscription = new Subscription(postData);
    let result = await subscription.save();
    return result;
}

getSubscription =async(subscription_id) => {
    result = await Subscription.findOne({_id: subscription_id});
    return result;
}

getAllSubscriptions =async(subscriber_id) => {
    result = await Subscription.find({subscriber_id: subscriber_id});
    return result;
}

getRenewableSubscriptions = async() => {
    let results = await Subscription.find({is_billable_in_this_cycle: true}).limit(4000);
    return results;
}

getBilledSubscriptions = async() => {
    let results = await Subscription.find(
        {$or:[{subscription_status:'billed'}], 
        next_billing_timestamp: {$lte: new Date()}, active: true});
    return results;
}

updateSubscription = async(subscription_id, postData) => {
    const query = { _id: subscription_id };
    postData.last_modified = new Date();

    try {
        const result = await Subscription.updateOne(query, postData);
        if (result.nModified === 0) {
            return undefined;
        } else {
            let subscription = await getSubscription(subscription_id);
            return subscription;
        }
    } catch(error) {
        console.log(error);
        return error;
    }
}

deleteSubscription = async(subscription_id) => {
    const result = await Subscription.deleteOne({_id: subscription_id});
    return result;
}

deleteAllSubscriptions = async(subscriber_id) => {
    const result = await Subscription.deleteMany({subscriber_id: subscriber_id});
    return result;
}

resetAmountBilledToday = async() => {
    const result = await Subscription.updateMany({},{$set: { amount_billed_today : 0}});
    return result;
}

markSubscriptionInactive = async(subscription_id) => {
    if (subscription_id) { 
        const query = { _id: subscription_id };
        const result = await Subscription.updateOne(query, { $set: { active: false } });
        if (result.nModified === 0) {
            return undefined;
        }else{
            let subscription = await getSubscription(subscription_id);
            return subscription;
        }
    } else {
         return undefined;
    }
}

unsubscribe = async(subscription_id) => {
    if (subscription_id) { 
        const query = { _id: subscription_id };
        const result = await Subscription.updateOne(query, { $set: { auto_renewal: false, subscription_status: 'expired' } });
        if (result.nModified === 0) {
            return undefined;
        }else{
            let subscription = await getSubscription(subscription_id);
            return subscription;
        }
    } else {
         return undefined;
    }
}

removeNumberAndHistory = async(msisdn) => {
    let userRepo = require('./UserRepo');
    let subscriberRepo = require('./SubscriberRepo');
    let historyRepo = require('./BillingHistoryRepo');

    let user = await userRepo.getUserByMsisdn(msisdn);
    if (user) { 
        let userId = user._id;
        await userRepo.deleteUser(userId);
        let subscriber = subscriberRepo.getSubscriber(userId);
        await deleteSubscriber(userId);
        await deleteAllSubscriptions(subscriber._id);
        await historyRepo.deleteMany(userId);

        console.log(`The MSISDN ${msisdn} records deleted successfully`);
    } else {
        console.log(`The MSISDN ${msisdn} failed to delete records`);
    }
}

getSubscriptionsToMark =async() => {
    let now = moment();
    let endOfDay = now.endOf('day').tz("Asia/Karachi");
    console.log("endOfDay",endOfDay);

    let results = await Subscription.find(
        {$or:[{subscription_status:'billed'},{subscription_status:'graced'},{subscription_status:'trial'}], 
        next_billing_timestamp: {$lte: endOfDay}, active: true}).select('_id');
    
        let subscription_ids = results.map(subscription => {
        return subscription._id;
    });
    return subscription_ids;
}

setAsBillableInNextCycle = async(subscription_ids) => {
    await Subscription.updateMany({_id: {$in :subscription_ids}},{$set:{is_billable_in_this_cycle: true}});
}



module.exports = {
    createSubscription: createSubscription,
    getSubscription: getSubscription,
    getAllSubscriptions: getAllSubscriptions,
    getRenewableSubscriptions: getRenewableSubscriptions,
    getBilledSubscriptions: getBilledSubscriptions,
    updateSubscription: updateSubscription,
    deleteSubscription: deleteSubscription,
    deleteAllSubscriptions: deleteAllSubscriptions,
    resetAmountBilledToday: resetAmountBilledToday,
    markSubscriptionInactive: markSubscriptionInactive,
    unsubscribe: unsubscribe,
    removeNumberAndHistory: removeNumberAndHistory,
    getSubscriptionsToMark: getSubscriptionsToMark,
    setAsBillableInNextCycle: setAsBillableInNextCycle
}