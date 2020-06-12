const config = require("../config");

class SubscriptionService {
    constructor({subscriptionRepository,billingHistoryRepository,packageRepository,subscriberRepository}) {
        this.subscriptionRepository = subscriptionRepository;
        this.billingHistoryRepository = billingHistoryRepository;
        this.packageRepository = packageRepository;
        this.subscriberRepository = subscriberRepository;
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

                history.transaction_id = undefined;
                history.operator_response = undefined;
                history.billing_status = 'expired';
                history.source = 'system';
                history.operator = 'telenor';
                return expire;
            } else {
                return undefined;
            }
        } catch (error){
            throw error;
        }
    }

    addToHistory(user_id,subscriber_id,subscription_id,package_id,paywall_id,source,){
        this.billingHistoryRepository.createBillingHistory()
    }

    
}

module.exports = SubscriptionService;