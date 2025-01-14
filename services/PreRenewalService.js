const container = require('../configurations/container');
const subscriptionRepo = container.resolve("subscriptionRepository");
const subscriberRepo = container.resolve("subscriberRepository");
const subscriptionService = container.resolve("subscriptionService");
const userRepo = container.resolve("userRepository");
const config = require('../config')
const messageRepository = container.resolve("messageRepository");

getPreRenewalSubscriptions = async() => {
    try {
        // let preRenewalSubscriptions = await this.subscriptionRepo.getPreRenwalSubscriptions();
        let preRenewalSubscriptions = await subscriptionRepo.getPreRenwalSubscriptions();
        // console.log("[Pre Renewal Subscriptions]",preRenewalSubscriptions);
        for (let i = 0 ; i < preRenewalSubscriptions.length ; i++) {
            console.log("[PreRenwal][susbscription_id]",preRenewalSubscriptions[i].next_billing_timestamp, preRenewalSubscriptions[i]._id);
            
            try {
                // TODO Unsubcribe
                let subscriber = await subscriberRepo.getSubscriber(preRenewalSubscriptions[i].subscriber_id);
                // console.log("subscriber_id", subscriber.user_id)
                // send Message
                let user = await userRepo.getUserById(subscriber.user_id);
                let message = `Kal ap k balance se Goonj TV renewal k Rs15 charge kiye jaein gy. Unsub k liye https://goonj.pk/unsubscribe?proxy=${user._id}&amp;pg=${preRenewalSubscriptions[i].subscribed_package_id} or Istemal k liye goonj.pk`;
                console.log("msisdn", user._id, message)
                messageRepository.sendSmsToUser(message,user.msisdn);
            } catch (err){
                console.log("[UnableToSendMessage]:",preRenewalSubscriptions[i]._id)
            }
            
        }
    } catch(err) {
        throw err;
    }
}



module.exports = {
    getPreRenewalSubscriptions: getPreRenewalSubscriptions
}