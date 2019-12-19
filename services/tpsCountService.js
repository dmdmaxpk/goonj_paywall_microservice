const CronJob = require('cron').CronJob;
const TpsCountRepo = require('../repos/tpsCountRepo');


// To set TPScount variables for queues to 0 
runJob  = async() => {
    // At every 3rd minute
    new CronJob('* * * * * *',  async() => {
        console.log('Running Every Second And Setting Count of Variable to 0' + (new Date()));
        try {
            let reset = TpsCountRepo.resetTPSCount();
            console.log("Count is Reset");
        } catch(err) {
            throw err;
        }
      }, null, true, 'America/Los_Angeles');
}


module.exports = {
    runJob: runJob
}