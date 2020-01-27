const ViewLogRepo = require('../repos/ViewLogRepo');
const subsriberRepo = require('../repos/SubscriberRepo');
const billingHistoryRepo = require('../repos/BillingHistoryRepo');
const userRepo = require('../repos/UserRepo');
const config = require('../config')

checkLastSeenOfUsers = async() => {
    try {
        let renewableSubscribers = await subsriberRepo.getBilledSubscribers();
        console.log("renewableSubscribers",renewableSubscribers);
        for (let i = 0 ; i < renewableSubscribers.length ; i++) {
            let latestViewLog = await ViewLogRepo.getLatestViewLog(renewableSubscribers[i].user_id);
            // if last viewed of user is
            // console.log("renewableSubscribers",renewableSubscribers);
            if (latestViewLog) {
                let lastViewedPlusTimePeriod = latestViewLog.added_dtm.setHours( latestViewLog.added_dtm.getHours() + config.unsub_time_limit);
                if (lastViewedPlusTimePeriod < new Date() ) {
                    console.log("Unsub user and send him message",renewableSubscribers[i].user_id);
                    let unsubscribed = await subsriberRepo.unsubscribe(renewableSubscribers[i].user_id);
                    let user = userRepo.getUserById(renewableSubscribers[i].user_id);
                    let message = `Your subscription to Goonj has been revoked because of inactivity. `;
	                let messageObj = {};
	                messageObj.message =  message;
	                messageObj.msisdn = user.msisdn;
                    rabbitMq.addInQueue(config.queueNames.messageDispathcer, messageObj);
                    let billingHistory = {};
                    billingHistory.user_id = user._id;
                    billingHistory.package_id = user.subscribed_package_id;
                    billingHistory.transaction_id = undefined;
                    billingHistory.operator_response = undefined;
                    billingHistory.billing_status = 'expired';
                    billingHistory.source = 'Subscribed because of inactivity by cron.';
                    billingHistory.operator = 'telenor';
                    await billingHistoryRepo.createBillingHistory(billingHistory);
                }
            }
        }
    } catch(err) {
        throw err;
    }
}



module.exports = {
    checkLastSeenOfUsers: checkLastSeenOfUsers
}