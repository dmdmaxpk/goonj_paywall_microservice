const container = require("../configurations/container");
const { use } = require("../routes/billingProducerRoutes");
const packageRepo = container.resolve("packageRepository");
const userRepo = container.resolve("userRepository");
const billingHistoryRepo = container.resolve("billingHistoryRepository");

const subscriberRepo = container.resolve("subscriberRepository");
const subscriptionRepo = container.resolve("subscriptionRepository");

exports.getPackage = async (req,res) =>  {
    let result = await packageRepo.getAllPackages({slug: 'live'});
    res.send(result);
}

exports.getOnlyRenewableSubscriptions = async (req,res) =>  {
    let result = await subscriptionRepo.getRenewableSubscriptions();
    let toBeSubscribed = [];
    for(let i = 0; i < result.length; i++){
        if(result[i].auto_renewal === true){
            try{
                let user = await userRepo.getUserBySubscriberId(result[i].subscriber_id);
                if(user){
                    let newObj = JSON.parse(JSON.stringify(result[i]));
                    newObj.userObj = user;
                    toBeSubscribed.push(newObj);
                }else{
                    console.log('=> No user object found for subscription ', result[i]._id);
                }
            }catch(e){
                console.log("### - catch", e);
            }
        }else{
            console.log("### expired");
            expire(result[i]);
        }
    }
    console.log("### sending report");
    res.send(toBeSubscribed);
}

// Expire users
expire = async(subscription) => {
    
    subscriptionRepo.updateSubscription(subscription._id, {
        subscription_status: 'expired', 
        is_allowed_to_stream:false, 
        is_billable_in_this_cycle:false, 
        consecutive_successive_bill_counts: 0,
        try_micro_charge_in_next_cycle: false,
        micro_price_point: 0,
        amount_billed_today: 0,
        priority:0,
        queued: false
    });


    let packageObj = await packageRepo.getPackage({_id: subscription.subscribed_package_id});
    let user = await userRepo.getUserBySubscriptionId(subscription._id);

    let history = {};
    history.user_id = user._id;
    history.subscriber_id = subscription.subscriber_id;
    history.subscription_id = subscription._id;
    history.package_id = subscription.subscribed_package_id;
    history.paywall_id = packageObj.paywall_id;
    history.transaction_id = undefined;
    history.operator_response = undefined;
    history.billing_status = 'expired';
    history.source = 'system';
    history.operator = subscription.payment_source ? subscription.payment_source : 'telenor';

    billingHistoryRepo.createBillingHistory(history);
    console.log("=> Expired", subscription._id);
}


















exports.createBillingHistory = async (req,res) =>  {
    console.log("Create Billing History");
    let body = req.body;
    let result = await billingHistoryRepo.createBillingHistory(body.postData);
    res.send(result);
}

exports.getUserById = async (req,res) =>  {
    console.log("Get User By ID");
    let query = req.query;
    let result = await userRepo.getUserById(query.id);
    res.send(result);
}

exports.getSubscriber = async (req,res) =>  {
    console.log("Get Subscriber By ID");
    let query = req.query;
    let result = await subscriberRepo.getSubscriber(query.id);
    res.send(result);
}

exports.getSubscription = async (req,res) =>  {
    console.log("Get Subscription By ID");
    let query = req.query;
    let result = await subscriptionRepo.getSubscription(query.id);
    res.send(result);
}



exports.updateSubscription = async (req,res) =>  {
    console.log("Update Subscriptions");
    let body = req.body;
    let result = await subscriptionRepo.updateSubscription(body.subscriptionArray, body.postData);
    res.send(result);
}

exports.updateAllSubscriptions = async (req,res) =>  {
    console.log("Update All Subscriptions");
    let body = req.body;
    let result = await subscriptionRepo.updateAllSubscriptions(body.subscriptionArray, body.postData);
    res.send(result);
}
