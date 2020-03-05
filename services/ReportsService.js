const reportsRepo = require('../repos/ReportsRepo');

generateDailyReport = async() => {
    console.log("generateDailyReports");
    reportsRepo.dailyReport();
    reportsRepo.callBacksReport();
    reportsRepo.dailyUnsubReport();
    reportsRepo.callBacksReport();
}

module.exports = {
    generateDailyReport: generateDailyReport
}