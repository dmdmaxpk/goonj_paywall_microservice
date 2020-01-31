const CronJob = require('cron').CronJob;
const subsriberRepo = require('../repos/SubscriberRepo');
const packageRepo = require('../repos/PackageRepo');
const billingHistoryRepo = require('../repos/BillingHistoryRepo');
const userRepo = require('../repos/UserRepo');
const config = require('../config');
const shortId = require('shortid');

// To generate token to consume telenor dcb apis

subscriptionRenewal = async() => {
    try {
        let subscribers = await subsriberRepo.getRenewableSubscribers();
        let subscribersToRenew = [];
        let subscribersNotToRenew = [];
        for(let i = 0; i < subscribers.length; i++){
            if (subscribers[i].auto_renewal === false && (subscribers[i].subscription_status === 'billed' 
            || subscribers[i].subscription_status === 'graced' || subscribers[i].subscription_status === 'trial'  ) ) {
                subscribersNotToRenew = [...subscribersNotToRenew, subscribers[i] ];
            } else {
                subscribersToRenew = [...subscribersToRenew,subscribers[i] ];
            }
        }
        
        for(let i = 0; i < subscribersNotToRenew.length; i++) {
            let subscriber = subscribersNotToRenew[i];
            await userRepo.updateUserById(subscriber.user_id, {subscription_status: 'expired'});
            let sub = await subsriberRepo.updateSubscriber(subscriber.user_id,{subscription_status: 'expired'});
            let user = await userRepo.getUserById(subscriber.user_id);
            let billingHistory = {};
		    billingHistory.user_id = subscriber.user_id;
            billingHistory.package_id = user.subscribed_package_id;
            billingHistory.transaction_id = undefined;
            billingHistory.operator_response = undefined;
            billingHistory.billing_status = 'expired';
            billingHistory.source = user.source;
            billingHistory.operator = 'telenor';
            await billingHistoryRepo.createBillingHistory(billingHistory);
        }

        let promisesArr = [];
        console.log("Subscribers to renew -> ",subscribersToRenew.length);
        for(let i = 0; i < subscribersToRenew.length; i++){
            let promise = getPromise(subscribersToRenew[i].user_id);
            promisesArr.push(promise);
        }
        let promises = await Promise.all(promisesArr);
    } catch(err){
        console.log(err);
    }
}

getPromise =  async(user_id) => {
    return new Promise((resolve, reject) => {
        userRepo.getUserById(user_id)
        .then((user) => {
            renewSubscription(user);
            resolve('-Done-');
        }).catch((err) => {
            reject('-Error!-');
        });
    });
} 

// Helper functions
function getCurrentDate() {
    var now = new Date();
    var strDateTime = [
        [now.getFullYear(),
            AddZero(now.getMonth() + 1),
            AddZero(now.getDate())].join("-"),
        [AddZero(now.getHours()),
            AddZero(now.getMinutes())].join(":")];
    return strDateTime;
}

function AddZero(num) {
    return (num >= 0 && num < 10) ? "0" + num : num + "";
}

renewSubscription = async(user) => {
    let packageObj = await packageRepo.getPackage({_id: user.subscribed_package_id});
    let subscriber = await subsriberRepo.getSubscriber(user._id);

    let msisdn = user.msisdn;
	let transactionId = "Goonj_"+msisdn+"_"+packageObj._id+"_"+shortId.generate()+"_"+getCurrentDate();
    let subscriptionObj = {};
	subscriptionObj.user_id = user._id;
	subscriptionObj.msisdn = msisdn;
	subscriptionObj.packageObj = packageObj;
    subscriptionObj.transactionId = transactionId;

    // Add object in queueing server
    if (subscriber.queued === false && subscriptionObj.msisdn && subscriptionObj.packageObj && subscriptionObj.packageObj.price_point_pkr && subscriptionObj.transactionId ) {
        let updated = await subsriberRepo.updateSubscriber(user._id, {queued: true});
		if(updated){
            rabbitMq.addInQueue(config.queueNames.subscriptionDispatcher, subscriptionObj);
			console.log('RenewSubscription - AddInQueue - ', msisdn, ' - ', transactionId, ' - ', (new Date()));
		}else{
			console.log('Failed to updated subscriber after adding in queue.');
		}
	} else {
		console.log( 'Could not add in Renewal Subscription Queue because critical parameters are missing ', subscriptionObj.msisdn ,
		subscriptionObj.packageObj.price_point_pkr,subscriptionObj.transactionId, msisdn, ' - ', (new Date()) );
	}
}

module.exports = {
    // runJob: runJob,
    subscriptionRenewal: subscriptionRenewal
}
