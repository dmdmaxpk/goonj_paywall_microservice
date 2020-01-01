const CronJob = require('cron').CronJob;
const subsriberRepo = require('../repos/SubscriberRepo');
const packageRepo = require('../repos/PackageRepo');
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
            await subsriberRepo.updateSubscriber(subscribersNotToRenew[i]._id,{subscription_status: 'unsubscribed'});
        }

        let promisesArr = [];
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
    
    let msisdn = user.msisdn;
	let transactionId = "Goonj_"+msisdn+"_"+packageObj._id+"_"+shortId.generate()+"_"+getCurrentDate();
    let subscriptionObj = {};
	subscriptionObj.user_id = user._id;
	subscriptionObj.msisdn = msisdn;
	subscriptionObj.packageObj = packageObj;
    subscriptionObj.transactionId = transactionId;

	// Add object in queueing server
    rabbitMq.addInQueue(config.queueNames.subscriptionDispatcher, subscriptionObj);
    console.log('RenewSubscription - AddInQueue - ', msisdn, ' - ', transactionId, ' - ', (new Date()));
}

module.exports = {
    // runJob: runJob,
    subscriptionRenewal: subscriptionRenewal
}
