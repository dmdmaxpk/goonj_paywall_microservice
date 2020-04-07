const reportsRepo = require('../repos/ReportsRepo');

generateDailyReport = async() => {
    console.log("generateDailyReports");
    //reportsRepo.dailyReport();
    reportsRepo.callBacksReport();
    //reportsRepo.dailyUnsubReport();
    //reportsRepo.errorCountReport();
    //reportsRepo.dailyFullAndPartialChargedUsers();
    reportsRepo.dailyTrialToBilledUsers();
}

module.exports = {
    generateDailyReport: generateDailyReport
}