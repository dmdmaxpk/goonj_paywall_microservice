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
    updateSubscriber: updateSubscriber,
    deleteSubscriber: deleteSubscriber
}