const reportsRepo = require('../repos/ReportsRepo');

generateDailyReport = async() => {
    console.log("generateDailyReports");
    reportsRepo.dailyReport();
    sleep(120*1000);
    reportsRepo.callBacksReport();
    sleep(120*1000);
    reportsRepo.dailyUnsubReport();
    sleep(120*1000);
    reportsRepo.errorCountReport();
    sleep(120*1000);
    reportsRepo.dailyFullAndPartialChargedUsers();
    sleep(120*1000);
    reportsRepo.dailyTrialToBilledUsers();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    generateDailyReport: generateDailyReport
}