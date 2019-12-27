const CronJob = require('cron').CronJob;
const TpsCountRepo = require('../repos/tpsCountRepo');
const SubscriberRepo = require('../repos/SubscriberRepo');

runJob  = async() => {
    new CronJob('* * * * * *',  async() => {
        try {
            await TpsCountRepo.resetTPSCount();
        } catch(err) {
            throw err;
        }
      }, null, true, 'America/Los_Angeles');
}

// TODO make this run after one day instead of one minute before committing
runDailyAmountJob  = async() => {
    console.log("Run daily Amount reset function");
    new CronJob('* * *',  async() => {
        try {
            console.log("Run daily Amount reset function");
            await SubscriberRepo.resetAmountBilledToday();
        } catch(err) {
            throw err;
        }
      }, null, true, 'America/Los_Angeles');
}



module.exports = {
    runJob: runJob,
    runDailyAmountJob: runDailyAmountJob
}