const reportsRepo = require('../repos/ReportsRepo');

generateDailyReport = async() => {
    console.log("generateDailyReport");
    reportsRepo.dailyReport();
}

module.exports = {
    generateDailyReport: generateDailyReport
}