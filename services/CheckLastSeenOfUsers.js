const ViewLogRepo = require('../repos/ViewLogRepo');
const container = require('../configurations/container');
const subscriptionRepo = container.resolve("subscriptionRepository");
const subscriptionService = container.resolve("subscriptionService");
const userRepo = container.resolve("userRepository");
const config = require('../config')

checkLastSeenOfUsers = async() => {
    try {
        let renewableSubscriptions = await subscriptionRepo.subscriptionToExpireNonUsage();
        console.log("[UnsubscribeDueToInactivity]",renewableSubscriptions);
        for (let i = 0 ; i < renewableSubscriptions.length ; i++) {
            console.log("[Unsubscriber][susbscription_id]",renewableSubscriptions[i]._id);
            
            try {
                // TODO Unsubcribe
                let unsubscribed = await subscriptionService.expire(renewableSubscriptions[i]._id);
                // send Message
                let user = userRepo.getUserById(renewableSubscriptions[i].user_id);
                let message = `Your subscription to Goonj has been revoked because of inactivity.`;
                this.messageRepository.sendSmsToUser(message,user.msisdn);
            } catch (err){
                console.log("[UnableToUnsubscribe]:",renewableSubscriptions[i]._id)
            }
            
        }
    } catch(err) {
        throw err;
    }
}



module.exports = {
    checkLastSeenOfUsers: checkLastSeenOfUsers
}