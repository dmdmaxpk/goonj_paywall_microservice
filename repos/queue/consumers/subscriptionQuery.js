let billingRepo = require("../../BillingRepo");

consume = async(message) => {
    try {
        console.log("consumer of subscriptionQuery",JSON.parse(message.content));
        let msisdn = JSON.parse(message.content);
        // TODO call api for getting subscriber query while increasing tps Count in db
        let responseData = await billingRepo.subscriberQuery(msisdn);
        //TODO add increment respective TPS when request is sent
        console.log("response Data",responseData);
        // once response is recieved save appropriate response in User model
        // set fields on User model "active", "autorenewal" appropriately

        //save history in billingHistory
        rabbitMq.acknowledge(message);
    } catch (error) {
        console.log(error);
        rabbitMq.acknowledge(message);
    }
   
}

module.exports = {
    consume: consume
}