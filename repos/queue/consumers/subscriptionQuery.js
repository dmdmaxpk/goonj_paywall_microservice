let billingRepo = require("../../BillingRepo");
let tpsCountRepo = require("../../tpsCountRepo");
let billingHistoryRepo = require("../../BillingHistoryRepo");
let userRepo = require("../../UserRepo");
let subscriberRepo = require("../../SubscriberRepo");
let config = require("../../../config");

consume = async(message) => {
    try {
        let message_content = JSON.parse(message.content);
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
            if (api_response.Message === "Success") {
                // user is customer of telenor
                await userRepo.updateUserById(message_content.user_id,{
                    operator: "telenor"
                });
            } else {
                // for now just print the response
                console.log("api_response",api_response);
            }
            
            rabbitMq.acknowledge(message);
        } else {
            console.log("TPS quota full for SubscriberQuery API, waiting for second to elapse -", new Date());
            setTimeout(() => {
                consume(message);
            }, 200);
        }
    } catch (error) {
        if (error && error.response && error.response.errorCode && error.response.errorMessage ) {
            console.log("Reached here -",error.response.errorCode,error.response.errorMessage);
            if ( error.response.errorCode === "500.002.03" && error.response.errorMessage === "Not a valid Telenor Customer.Please try again.") {
                // user is not customer of telenor
                // set operator and set active of user to false
                console.log("Reached here");
                await userRepo.updateUserById(message_content.user_id,{
                    operator: "not_telenor",
                    active: false
                });
                // also set active and autorenewal of subscriber to false
                await subscriberRepo.updateUserById(message_content.user_id,{
                    active: false,
                    auto_renewal: false
                });
            }
        }
        console.error("Subscriber Query",error);
        
        rabbitMq.acknowledge(message);
    }
   
}

module.exports = {
    consume: consume
}