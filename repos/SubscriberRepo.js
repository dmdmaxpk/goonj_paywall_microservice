const mongoose = require('mongoose');
const Subscriber = mongoose.model('Subscriber');
const moment = require("moment");

createSubscriber = async(postData) => {
    let subscriber = new Subscriber(postData);
    let result = await subscriber.save();
    return result;
}

getSubscriber =async(id) => {
    let result = await Subscriber.findOne({_id: id});
    return result;
}

getSubscriberByUserId =async(user_id) => {
    let result = await Subscriber.findOne({user_id: user_id});
    return result;
}

getRenewableSubscribers =async() => {
    let results = await Subscriber.find({is_billable_in_this_cycle: true}).limit(4000);
    return results;
}

getBilledSubscribers =async() => {
    let results = await Subscriber.find(
        {$or:[{subscription_status:'billed'}], 
        next_billing_timestamp: {$lte: new Date()}, active: true});
    return results;
}


updateSubscriber = async(user_id, postData) => {
    const query = { user_id: user_id };
    postData.last_modified = new Date();
    try {
        const result = await Subscriber.updateOne(query, postData);
        if (result.nModified === 0) {
            return undefined;
        } else {
            let subscriber = await getSubscriber(user_id);
            return subscriber;
        }
    } catch(error) {
        console.log(error);
        return error;
    }
}

deleteSubscriber = async(user_id) => {
    const result = await Subscriber.deleteOne({user_id: user_id});
    return result;
}

resetAmountBilledToday = async() => {
    const result = await Subscriber.updateMany({},{$set: { amount_billed_today : 0}});
    return result;
}

setSubcriberInactive = async(user_id) => {
    if (user_id) { 
        const query = { user_id: user_id };
        const result = await Subscriber.updateOne(query,{ $set: { active: false } });
        if (result.nModified === 0) {
            return undefined;
        }else{
            let subscriber = await getSubscriber(user_id);
            return subscriber;
        }
    } else {
         return undefined;
    }
}

unsubscribe = async(user_id) => {
    if (user_id) { 
        const query = { user_id: user_id };
        const result = await Subscriber.updateOne(query,{ $set: { auto_renewal: false,subscription_status: 'expired' } });
        if (result.nModified === 0) {
            return undefined;
        }else{
            let subscriber = await getSubscriber(user_id);
            return subscriber;
        }
    } else {
         return undefined;
    }
}

removeNumberAndHistory = async(msisdn) => {
    let userRepo = require('../repos/UserRepo');
    let historyRepo = require('../repos/BillingHistoryRepo');

    let user = await userRepo.getUserByMsisdn(msisdn);
    if (user) { 
        let userId = user._id;
        await userRepo.deleteUser(userId);
        await deleteSubscriber(userId);
        await historyRepo.deleteMany(userId);
        console.log(`The MSISDN ${msisdn} records deleted successfully`);
    } else {
        console.log(`The MSISDN ${msisdn} failed to delete records`);
    }
}

getSubscribersToMark =async() => {
    let now = moment();
    let endOfDay = now.endOf('day').tz("Asia/Karachi");
    console.log("endOfDay",endOfDay);
    let results = await Subscriber.find(
        {$or:[{subscription_status:'billed'},{subscription_status:'graced'},{subscription_status:'trial'}], 
        next_billing_timestamp: {$lte: endOfDay}, active: true}).select('user_id');
    let user_ids = results.map(user_id => {
        return user_id.user_id;
    });
    return user_ids;
}

setAsBillableInNextCycle = async(user_ids) => {
    let result = await Subscriber.updateMany({user_id: {$in :user_ids}},{$set:{is_billable_in_this_cycle: true}});
}



module.exports = {
    createSubscriber: createSubscriber,
    getSubscriber: getSubscriber,
    getRenewableSubscribers: getRenewableSubscribers,
    updateSubscriber: updateSubscriber,
    deleteSubscriber: deleteSubscriber,
    resetAmountBilledToday: resetAmountBilledToday,
    setSubcriberInactive: setSubcriberInactive,
    getBilledSubscribers: getBilledSubscribers,
    unsubscribe: unsubscribe,
    removeNumberAndHistory: removeNumberAndHistory,
    getSubscribersToMark: getSubscribersToMark,
    getSubscriberByUserId: getSubscriberByUserId,
    setAsBillableInNextCycle: setAsBillableInNextCycle
}