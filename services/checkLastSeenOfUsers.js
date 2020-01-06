const ViewLogRepo = require('../repos/ViewLogRepo');
const subsriberRepo = require('../repos/SubscriberRepo');
const config = require('../config')

checkLastSeenOfUsers = async() => {
    try {
        let renewableSubscribers = await subsriberRepo.getRenewableSubscribers();
        for (let i = 0 ; i < renewableSubscribers.length ; i++) {
            let latestViewLog = await ViewLogRepo.getLatestViewLog(renewableSubscribers[i]);
            // if last viewed of user is
            let lastViewedPlusTimePeriod = latestViewLog.added_dtm.setHours( latestViewLog.added_dtm.getHours() + config.unsub_time_limit);
            if (lastViewedPlusTimePeriod < new Date() ) {
                console.log("Unsub user and send him message");
            }
        }
    } catch(err) {
        throw err;
    }
}



module.exports = {
    checkLastSeenOfUsers: checkLastSeenOfUsers
}