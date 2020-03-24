const config = require("../config")
addToSubscriberQueryQueue = async (msisdn,user_id) => {
    let message = {msisdn:msisdn,user_id: user_id }
    if (message.msisdn && message.user_id ) {
        rabbitMq.addInQueue(config.queueNames.subscriberQueryDispatcher, message);
    } else {
        console.log("critical parameter addToSubscriberQueryQueue" , message);
    }
}

module.exports = {
    addToSubscriberQueryQueue: addToSubscriberQueryQueue
}