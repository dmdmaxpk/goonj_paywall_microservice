const config = require("../config")
addToSubscriberQueryQueue = async (message) => {
    if (message) {
        rabbitMq.addInQueue(config.queueNames.subscriberQueryDispatcher, message);
    } else {
        console.log("critical parameter undefined addToSubscriberQueryQueue" , message)
    }
}

module.exports = {
    addToSubscriberQueryQueue: addToSubscriberQueryQueue
}