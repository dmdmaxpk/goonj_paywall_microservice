const reportsRepo = require('../repos/ReportsRepo');
const subscriberRepo = require('../repos/SubscriberRepo');

generateDailyReport = async() => {
    console.log("generateDailyReports");
    /*reportsRepo.dailyReport();
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
    await sleep(120*1000)*/
    //reportsRepo.dailyChannelWiseUnsub();


    // Unsub number daily
    await removeNumberAndHistory('03476733767');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    generateDailyReport: generateDailyReport
}