const reportsRepo = require('../repos/ReportsRepo');

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
    reportsRepo.dailyTrialToBilledUsers();*/

    reportsRepo.dailyChannelWiseUnsub();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    generateDailyReport: generateDailyReport
}