const reportsRepo = require('../repos/ReportsRepo');
const subscriberRepo = require('../repos/SubscriberRepo');

generateDailyReport = async() => {
    console.log("generateDailyReports");

    reportsRepo.getTotalUserBaseTillDate();
    await sleep(120*1000);
    reportsRepo.getExpiredBase();

    /*reportsRepo.dailyReport();

    //Unsub Zara's number daily
    await subscriberRepo.removeNumberAndHistory('03458561755');
    
    await sleep(120*1000);
    reportsRepo.callBacksReport();
    
    await sleep(120*1000);
    reportsRepo.dailyUnsubReport();
    
    await sleep(120*1000);
    reportsRepo.errorCountReport();
    
    await sleep(120*1000);
    reportsRepo.dailyFullAndPartialChargedUsers();
    
    await sleep(120*1000);
    reportsRepo.dailyTrialToBilledUsers();
    
    await sleep(120*1000);
    reportsRepo.dailyChannelWiseUnsub();

    await sleep(120*1000);
    reportsRepo.dailyChannelWiseTrialActivated();

    await sleep(120*1000);
    reportsRepo.dailyPageViews();*/
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    generateDailyReport: generateDailyReport
}