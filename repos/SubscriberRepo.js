const mongoose = require('mongoose');
const Subscriber = mongoose.model('Subscriber');

createSubscriber = async(postData) => {
    let subscriber = new Subscriber(postData);
    let result = await subscriber.save();
    return result;
}

getSubscriber =async(msisdn) => {
    result = await Subscriber.findOne({msisdn: msisdn});
    return result;
}

getRenewableSubscribers =async() => {
    let results = await Subscriber.find(
        {$or:[{subscription_status:'billed'},{subscription_status:'graced'}], 
        next_billing_timestamp: {$lte: new Date()}, active: true});
    return results;
}

updateSubscriber = async(msisdn, postData) => {
    const query = { msisdn: msisdn };
    postData.last_modified = new Date();
    const result = await Subscriber.updateOne(query, postData);
    if (result.nModified === 0) {
        return undefined;
    }else{
        let subscriber = await getSubscriber(msisdn);
        return subscriber;
    }
}

deleteSubscriber = async(msisdn) => {
    const result = await Subscriber.deleteOne({msisdn: msisdn});
    return result;
}


module.exports = {
    createSubscriber: createSubscriber,
    getSubscriber: getSubscriber,
    getRenewableSubscribers: getRenewableSubscribers,
    updateSubscriber: updateSubscriber,
    deleteSubscriber: deleteSubscriber
}