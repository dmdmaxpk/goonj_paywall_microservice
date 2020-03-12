let billingRepo = require("../../BillingRepo");
let tpsCounRepo = require("../../tpsCountRepo");
let config = require("../../../config");

consume = async(message) => {
    try {
        let msisdn = JSON.parse(message.content);
        console.log("consumer of subscriptionQuery",JSON.parse(message.content));
        let countThisSec = await tpsCountRepo.getTPSCount(config.queueNames.subscriberQueryDispatcher);
        if (countThisSec < config.telenor_message_api_tps) { 
            //TODO add increment respective TPS when request is sent
            await tpsCounRepo.incrementTPSCount(config.queueNames.subscriberQueryDispatcher);
            // TODO call api for getting subscriber query while increasing tps Count in db
            let responseData = await billingRepo.subscriberQuery(msisdn);
            console.log("response Data",responseData);
            // once response is recieved save appropriate response in User model
            // set fields on User model "active", "autorenewal" appropriately
    
            //save history in billingHistory
            rabbitMq.acknowledge(message);
        }
    } catch (error) {
        console.log(error);
        rabbitMq.acknowledge(message);
    }
   
}

module.exports = {
    consume: consume
}