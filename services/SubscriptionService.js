const config = require("../config");

class SubscriptionService {
    constructor({subscriptionRepository,billingHistoryRepository,packageRepository,
            subscriberRepository,userRepository,paywallRepository,messageRepository}) {
        this.subscriptionRepository = subscriptionRepository;
        this.billingHistoryRepository = billingHistoryRepository;
        this.packageRepository = packageRepository;
        this.subscriberRepository = subscriberRepository;
        this.userRepository = userRepository;
        this.paywallRepository = paywallRepository;
        this.messageRepository = messageRepository;
    }

    async expire(subscription_id,source,operator_response,transaction_id){
        try {
            if (subscription_id){
                let subscription = await this.subscriptionRepository.getSubscription(subscription_id);
                let packageOfThisSubcription = await this.this.packageRepository.getPackage({_id: subscription.subscribed_package_id});
                let subscriber = await this.subscriberRepository.getSubscriber(subscription.subscriber_id);
                let expire = await this.subscriptionRepository.updateSubscription(subscription_id,{
                    subscription_status: 'expired', 
                    is_allowed_to_stream:false, 
                    is_billable_in_this_cycle:false, 
                    consecutive_successive_bill_counts: 0,
                    try_micro_charge_in_next_cycle: false,
                    micro_price_point: 0
                });
                let history = {};
                history.user_id = subscriber.user_id;
                history.subscriber_id = subscription.subscriber_id;
                history.subscription_id = subscription._id;
                history.package_id = subscription.subscribed_package_id;
                history.paywall_id = packageOfThisSubcription.paywall_id;

                history.transaction_id = transaction_id;
                history.operator_response = operator_response;
                history.billing_status = 'expired';
                history.source = source;
                history.operator = 'telenor';
                await this.billingHistoryRepository.create(history);
                return expire;
            } else {
                return undefined;
            }
        } catch (error){
            throw error;
        }
    }

    async expireByMsisdn(msisdn,paywall_slug,source,operator_response){
        console.log("[systemUnsubscribe]expireByMsisdn");
        return new Promise(async (resolve,reject) => {
            try {
                if (msisdn && paywall_slug){
                   let user  = await this.userRepository.getUserByMsisdn(msisdn);
                   let paywall  = await this.paywallRepository.getPaywallsBySlug(paywall_slug);
                   if (user && paywall ) {
                        let subscriber = await this.subscriberRepository.getSubscriberByUserId(user._id);
                        if (subscriber) {
                            let subscriptions = await this.subscriptionRepository.getAllSubscriptions(subscriber._id);
                            console.log("[systemUnsubscribe]subscriptions",subscriptions);
                            if (subscriptions.length > 0) {
                                let temp = 0;
                                for (let i =0 ; i < subscriptions.length; i++) {
                                    let subscription = subscriptions[i];
                                    console.log("[systemUnsubscribe]susbscription_id",subscription._id);
                                    console.log("[systemUnsubscribe]package_id",subscription.subscribed_package_id);
                                    console.log("[systemUnsubscribe]package_ids",paywall.package_ids);
                                    if (paywall.package_ids.indexOf(subscription.subscribed_package_id) > -1){
                                        let history = {};
                                        history.user_id = subscriber.user_id;
                                        history.subscriber_id = subscription.subscriber_id;
                                        history.subscription_id = subscription._id;
                                        history.package_id = subscription.subscribed_package_id;
                                        history.paywall_id = packageOfThisSubcription.paywall_id;
                                        history.transaction_id = transaction_id;
                                        history.operator_response = operator_response;
                                        history.billing_status = 'expired';
                                        history.source = source;
                                        history.operator = 'telenor';
                                        let response = await this.expireSubscription(subscription._id,paywall.paywall_name,
                                                        user.msisdn,history);
                                        console.log("[systemUnsubscribe]response",response);
                                    } else {
                                        temp++;
                                    }
                                }
                                if (temp === subscriptions.length) {
                                    resolve("Could not find subscription of user for this paywall.")
                                } else {
                                    resolve("Subscription Unsubscribed")
                                }
                            } else {
                                resolve("User has not been subscribed");
                            }
                        } else {
                            resolve("User has not been subscribed");    
                        }
                    } else {
                        resolve("User or Paywall doesn't exist");
                    }
                } else {
                    resolve("No msisdn or paywall name provided");
                }
            } catch (error){
                reject(error);
            }
        });
    }

    async expireSubscription(subscription_id,paywall_name,msisdn,history){
        return new Promise(async (resolve,reject) => {
            if (subscription_id) {
                let expire = await this.subscriptionRepository.updateSubscription(subscription_id,{
                    subscription_status: 'expired', 
                    is_allowed_to_stream:false, 
                    is_billable_in_this_cycle:false, 
                    consecutive_successive_bill_counts: 0,
                    try_micro_charge_in_next_cycle: false,
                    micro_price_point: 0
                });
                // add to history
                
                await this.billingHistoryRepository.create(history);
    
                // send sms to user
                let text = `Apki Goonj TV per ${paywall_name} ki subscription khatm kr di gai ha. Phr se subscribe krne k lye link par click karen https://www.goonj.pk/goonjplus/subscribe`;
                this.messageRepository.sendSmsToUser(paywall_name,msisdn);
                resolve("Succesfully unsubscribed");
            } else {
                resolve("Subscription id not found");
            }
        });
    }
    
}

module.exports = SubscriptionService;