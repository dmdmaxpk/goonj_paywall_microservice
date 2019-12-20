const CronJob = require('cron').CronJob;
const TpsCountRepo = require('../repos/tpsCountRepo');

runJob  = async() => {
    new CronJob('* * * * * *',  async() => {
        try {
            await TpsCountRepo.resetTPSCount();
        } catch(err) {
            throw err;
        }
      }, null, true, 'America/Los_Angeles');
}


module.exports = {
    runJob: runJob
}