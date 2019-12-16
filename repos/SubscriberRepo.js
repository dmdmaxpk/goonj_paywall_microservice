const mongoose = require('mongoose');
const Subscriber = mongoose.model('Subscriber');

createSubscriber = async(postData) => {
    let subscriber = new Subscriber(postData);
    let result = await subscriber.save();
    return result;
}

getSubscriber =async(user_id) => {
    result = await Subscriber.findOne({user_id: user_id});
    return result;
}

getRenewableSubscribers =async() => {
    let results = await Subscriber.find(
        {$or:[{subscription_status:'billed'},{subscription_status:'graced'}], 
        next_billing_timestamp: {$lte: new Date()}, active: true});
    return results;
}

updateSubscriber = async(user_id, postData) => {
    const query = { user_id: user_id };
    postData.last_modified = new Date();
    const result = await Subscriber.updateOne(query, postData);
    if (result.nModified === 0) {
        return undefined;
    }else{
        let subscriber = await getSubscriber(user_id);
        return subscriber;
    }
}

deleteSubscriber = async(user_id) => {
    const result = await Subscriber.deleteOne({user_id: user_id});
    return result;
}


module.exports = {
    createSubscriber: createSubscriber,
    getSubscriber: getSubscriber,
    getRenewableSubscribers: getRenewableSubscribers,
    updateSubscriber: updateSubscriber,
    deleteSubscriber: deleteSubscriber
}