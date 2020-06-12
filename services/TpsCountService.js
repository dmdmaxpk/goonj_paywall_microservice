const container = require('../configurations/container');
const CronJob = require('cron').CronJob;
const TpsCountRepo = container.resolve("tpsCountRepository");
const SubscriptionRepo = container.resolve("subscriptionRepository");

tpsCountReset = async() => {
    try {
        await TpsCountRepo.resetTPSCount();
    } catch(err) {
        throw err;
    }
}


dailyAmountReset = async() => {
    try {
        // Logging this to see if it realy is running every day at midnight
        console.log("Daily Amount Cron job", new Date());
        await SubscriptionRepo.resetAmountBilledToday();
    } catch(err) {
        throw err;
    }
}



module.exports = {
    tpsCountReset: tpsCountReset,
    dailyAmountReset: dailyAmountReset
}