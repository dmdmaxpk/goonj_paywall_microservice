const reportsRepo = require('../repos/ReportsRepo');

generateDailyReport = async() => {
    console.log("generateDailyReports");
    reportsRepo.dailyReport();
    reportsRepo.callBacksReport();
    reportsRepo.dailyUnsubReport();
    reportsRepo.errorCountReport();
}

module.exports = {
    generateDailyReport: generateDailyReport
}