let billingRepo = require("../../BillingRepo");
let tpsCountRepo = require("../../tpsCountRepo");
let billingHistoryRepo = require("../../BillingHistoryRepo");
let userRepo = require("../../UserRepo");
let subscriberRepo = require("../../SubscriberRepo");
let messageRepo = require("../../MessageRepo");
let config = require("../../../config");

consume = async(message) => {
    let message_content = JSON.parse(message.content);
    try {
        console.log("consumer of subscriptionQuery",message_content);
        let countThisSec = await tpsCountRepo.getTPSCount(config.queueNames.subscriberQueryDispatcher);
        if (countThisSec < config.telenor_message_api_tps) { 
            await tpsCountRepo.incrementTPSCount(config.queueNames.subscriberQueryDispatcher);
            let responseData = await billingRepo.subscriberQuery(message_content.msisdn);
            console.log("response Data",responseData);
            let api_response = responseData;
            //save history in billingHistory
            let billingHistory = {};
            billingHistory.user_id = message_content.user_id;
            billingHistory.billing_status = "subscriber_query_api";
            billingHistory.operator = "telenor";
            billingHistory.operator_response = api_response;
            await billingHistoryRepo.createBillingHistory(billingHistory);

            // once response is recieved save appropriate response in User model
            // set fields on User model "active", "autorenewal" appropriately
            if (api_response.Message === "Success" && api_response.AssetStatus === "Active") {
                // user is customer of telenor
                await userRepo.updateUserById(message_content.user_id,{
                    operator: "telenor"
                });
            } else {
                // for now just print the response
                console.log("api_response",api_response);
                revokeUserAccess(message_content.user_id,api_response,message_content.msisdn);
            }
            
            rabbitMq.acknowledge(message);
        } else {
            console.log("TPS quota full for SubscriberQuery API, waiting for second to elapse -", new Date());
            setTimeout(() => {
                consume(message);
            }, 200);
        }
    } catch (error) {
        // TODO if telenor api returns spike arrest violation error requeue the message
        if (error && error.response.data && error.response.data.errorCode && error.response.data.errorMessage ) {
            if ( error.response.data.errorCode === "500.002.03" && error.response.data.errorMessage === "Not a valid Telenor Customer. Please try again.") {
                // user is not customer of telenor
                // set operator and set active of user to false
                revokeUserAccess(message_content.user_id,error.response.data,message_content.msisdn);
            }
        }
        console.error("Subscriber Query",error);
        
        rabbitMq.acknowledge(message);
    }
   
}

module.exports = {
    consume: consume
}


async function  revokeUserAccess(user_id,data,msisdn){
    await userRepo.updateUserById(user_id,{
        operator: "not_telenor",
        subscription_status: "expired",
        active: false
    });
    // also set active and autorenewal of subscriber to false
    await subscriberRepo.updateSubscriber(user_id,{
        active: false,
        subscription_status: "expired",
        auto_renewal: false
    });
    
    accesRevokeMessageToUser(msisdn);

    let billingHistory = {};
    billingHistory.user_id = user_id;
    billingHistory.billing_status = "blocked";
    billingHistory.operator = "not_telenor";
    billingHistory.operator_response = data;
    await billingHistoryRepo.createBillingHistory(billingHistory);

}

async function accesRevokeMessageToUser(msisdn){
    let text = `Dear User, Goonj is only accessible from Telenor's Network at the moment. Please check again later.`
    messageRepo.sendSmsToUser(text,msisdn)
}

