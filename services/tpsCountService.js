const CronJob = require('cron').CronJob;
const TpsCountRepo = require('../repos/tpsCountRepo');
const SubscriberRepo = require('../repos/SubscriberRepo');

// runJob  = async() => {
//     new CronJob('* * * * * *',  async() => {
        
//       }, null, true, 'America/Los_Angeles');
// }

// // This should run everyday at midnight
// runDailyAmountJob  = async() => {
//     new CronJob('0 0 0 * * *',  async() => {
        
//       }, null, true, 'America/Los_Angeles');
// }

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
        await SubscriberRepo.resetAmountBilledToday();
    } catch(err) {
        throw err;
    }
}



module.exports = {
    tpsCountReset: tpsCountReset,
    dailyAmountReset: dailyAmountReset
}