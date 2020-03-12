const config = require("../config")
addToSubscriberQueryQueue = async (message) => {
    rabbitMq.addInQueue(config.queueNames.subscriberQueryDispatcher, message);
}

module.exports = {
    addToSubscriberQueryQueue: addToSubscriberQueryQueue
}