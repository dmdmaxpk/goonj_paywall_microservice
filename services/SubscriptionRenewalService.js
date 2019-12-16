const CronJob = require('cron').CronJob;
const subsriberRepo = require('../repos/SubscriberRepo');
const packageRepo = require('../repos/PackageRepo');

// To generate token to consume telenor dcb apis
runJob  = async() => {
    // At every 3rd minute
    new CronJob('*/3 * * * *',  async() => {
        console.log('Cron - SubscriptionRenewal - Executing - ' + (new Date()));
        try{
            let subscribers = await subsriberRepo.getRenewableSubscribers();
            for(let i = 0; i < subscribers.length; i++){
                let packageObj = packageRepo.getPackage({_id: subscribers[i].package});
                renewSubscription(subscribers[i].msisdn, packageObj);
            }
        }catch(err){
            console.log(err);
        }
      }, null, true, 'America/Los_Angeles');
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

function renewSubscription(msisdn, packageObj){
	let transactionId = "Goonj_"+msisdn+"_"+packageObj._id+"_"+getCurrentDate();
	let subscriptionObj = {};
	subscriptionObj.msisdn = msisdn;
	subscriptionObj.packageObj = packageObj;
	subscriptionObj.transactionId = transactionId;

	// Add object in queueing server
	rabbitMq.addInQueue(config.queueNames.subscriptionDispatcher, subscriptionObj);
    console.log('RenewSubscription - AddInQueue - ', subscribers[i].msisdn, ' - ', (new Date()));
}

module.exports = {
    runJob: runJob
}
