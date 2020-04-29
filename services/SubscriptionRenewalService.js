const CronJob = require('cron').CronJob;
const subsriberRepo = require('../repos/SubscriberRepo');
const packageRepo = require('../repos/PackageRepo');
const billingHistoryRepo = require('../repos/BillingHistoryRepo');
const userRepo = require('../repos/UserRepo');
const config = require('../config');
const shortId = require('shortid');
const chargeAttemptRepo = require('../repos/ChargingAttemptRepo');
const winston = require('winston');
const moment = require('moment');

const winstonLogger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'paywall_service' },
    transports: [
      new winston.transports.File({ filename: '/home/winston_logs/queue.log', level: 'info' })    ]
});

subscriptionRenewal = async() => {
    try {
        let subscribers = await subsriberRepo.getRenewableSubscribers();
        let subscribersToRenew = [];
        let subscribersNotToRenew = [];

        for(let i = 0; i < subscribers.length; i++){
            if(subscribers[i].auto_renewal === false){
                subscribersNotToRenew = [...subscribersNotToRenew, subscribers[i] ];
            }else {
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

            let attempt = await chargeAttemptRepo.getAttempt(subscriber._id);
            if(attempt && attempt.active === true){
                await chargeAttemptRepo.updateAttempt(subscriber._id, {active: false});
            }
            await billingHistoryRepo.createBillingHistory(billingHistory);
        }

        let promisesArr = [];
        console.log("Subscribers to renew -> ", subscribersToRenew.length);
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
    let chargeAttempt = await chargeAttemptRepo.getAttempt(subscriber._id);

    let msisdn = user.msisdn;
    let transactionId;
    
    let subscriptionObj = {};
    subscriptionObj.packageObj = packageObj;
    subscriptionObj.user_id = user._id;
    subscriptionObj.msisdn = msisdn;
    
    if(chargeAttempt && chargeAttempt.queued === false && chargeAttempt.active === true && chargeAttempt.number_of_attempts_today >= 2){
        await chargeAttemptRepo.queue(subscriber._id);
        transactionId = "GoonjMiniCharge_"+msisdn+"_"+subscriber._id+"_Price_"+chargeAttempt.price_to_charge+"_"+shortId.generate()+"_"+getCurrentDate();
        subscriptionObj.attemp_id = chargeAttempt._id;
        subscriptionObj.micro_charge = true;
        subscriptionObj.price_to_charge = chargeAttempt.price_to_charge;
    }else{
        transactionId = "Goonj_"+msisdn+"_"+subscriber._id+"_"+packageObj._id+"_"+shortId.generate()+"_"+getCurrentDate();
    }
    subscriptionObj.transactionId = transactionId;

    if (subscriber.is_discounted === true && subscriber.discounted_price){ 
        subscriptionObj.packageObj.price_point_pkr = subscriber.discounted_price;
    }
    // Add object in queueing server
    if (subscriptionObj.msisdn && (subscriptionObj.packageObj || subscriptionObj.micro_charge) && subscriptionObj.transactionId ) {
        winstonLogger.info('Preparing to add in queue', { 
            user_id: subscriptionObj.user_id,
            micro_charge: subscriptionObj.micro_charge,
            micro_price_to_charge: subscriptionObj.price_to_charge,
            time: new Date()
        });

        if(subscriber.queued === false){
            let updated = await subsriberRepo.updateSubscriber(user._id, {queued: true});
            winstonLogger.info('Subscriber queued true - before if', { 
                user_id: subscriptionObj.user_id,
                time: new Date()
            });
            if(updated){
                winstonLogger.info('Subscriber queued true - after if', { 
                    user_id: subscriptionObj.user_id,
                    time: new Date()
                });
                rabbitMq.addInQueue(config.queueNames.subscriptionDispatcher, subscriptionObj);
                winstonLogger.info('Added in queue', { 
                    user_id: subscriptionObj.user_id
                });

                if(subscriptionObj.micro_charge){
                    console.log('RenewSubscriptionMiniCharge - AddInQueue - ', msisdn, ' - ', transactionId, ' - ', (new Date()));    
                }else{
                    console.log('RenewSubscription - AddInQueue - ', msisdn, ' - ', transactionId, ' - ', (new Date()));
                }
            }else{
                winstonLogger.info('Failed to add subscriber in queue', { 
                    subscriber: subscriber
                });
                console.log('Failed to updated subscriber after adding in queue.');
            }
        }else{
            winstonLogger.info('Failed to add in renewal queue', { 
                user_id: subscriptionObj.user_id
            });
            console.log('Failed to add in renewal queue, current queuing status: ', subscriptionObj.msisdn, ' - ', subscriber.queued);  
        }
	} else {
		console.log('Could not add in renewal queue because critical parameters are missing: ', subscriptionObj.msisdn ,
		subscriptionObj.packageObj.price_point_pkr,subscriptionObj.transactionId, msisdn, ' - ', (new Date()) );
	}
}

markRenewableUser = async() => {
    try {
        let now = moment().tz("Asia/Karachi");
        console.log("Get Hours",now.hours());
        let hour = now.hours();
        if (config.hours_on_which_to_run_renewal_cycle.includes(hour)) {
            console.log("running renewal cycle, hour: ", hour);
            let subsuser_ids  = await subsriberRepo.getSubscribersToMark();
            console.log("Number of subscribers in this cycle: ", subsuser_ids.length);
            await subsriberRepo.setAsBillableInNextCycle(subsuser_ids);
        } else {
            console.log("Not running renewal cycle this hour");
        }
    } catch(err) {
        console.error(err);
    }
}

module.exports = {
    // runJob: runJob,
    subscriptionRenewal: subscriptionRenewal,
    markRenewableUser: markRenewableUser
}
