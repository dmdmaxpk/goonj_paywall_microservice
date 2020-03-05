const reportsRepo = require('../repos/ReportsRepo');

generateDailyReport = async() => {
    console.log("generateDailyReport");
    reportsRepo.dailyReport();
    reportsRepo.callBacksReport();
}

module.exports = {
    generateDailyReport: generateDailyReport
}