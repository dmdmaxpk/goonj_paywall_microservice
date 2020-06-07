const reportsRepo = require('../repos/ReportsRepo');
const affiliateReportsRepo = require('../repos/affiliateReportRepo');
const subscriberRepo = require('../repos/SubscriberRepo');

generateDailyReport = async() => {
    console.log("=> Generating Daily Reports");

    reportsRepo.dailyReport();
    console.log("=> Done");

    //Unsub Zara's number daily
    //await subscriberRepo.removeNumberAndHistory('03458561755');
    //console.log("=> Done");

    await sleep(120*1000);
    reportsRepo.callBacksReport();
    console.log("=> Done");

    await sleep(120*1000);
    reportsRepo.dailyUnsubReport();
    console.log("=> Done");

    await sleep(120*1000);
    reportsRepo.errorCountReport();
    console.log("=> Done");

    await sleep(120*1000);
    reportsRepo.dailyFullAndPartialChargedUsers();
    console.log("=> Done");

    await sleep(120*1000);
    reportsRepo.dailyTrialToBilledUsers();
    console.log("=> Done");

    await sleep(120*1000);
    reportsRepo.dailyChannelWiseUnsub();
    console.log("=> Done");

    await sleep(120*1000);
    reportsRepo.dailyChannelWiseTrialActivated();
    console.log("=> Done");

    await sleep(120*1000);
    reportsRepo.dailyPageViews();
    console.log("=> Done");

    await sleep(120*1000);
    affiliateReportsRepo.gdnReport(false);
    console.log("=> Done");
}

generateEveryThreeDaysReports =  async() => {

}

generateWeeklyReports =  async() => {
    
    let from = new Date();
    from.setDate(from.getDate() - 8);
    from.setHours(0);
    from.setMinutes(0);
    from.setSeconds(0);

    var to = new Date();
    to.setDate(to.getDate() -1);
    to.setHours(23);
    to.setMinutes(59);
    to.setSeconds(59);

    reportsRepo.getInactiveBase(from, to);
    await sleep(300 * 1000); // minutes sleep
    reportsRepo.getExpiredBase(from, to);
}

generateMonthlyReports =  async() => {

    //First date of previous month
    var from = new Date();
    from.setDate(0);
    from.setDate(1);
    from.setHours(0);
    from.setMinutes(0);
    from.setSeconds(0);

    //Last day of previous month
    var to = new Date();
    to.setDate(0);
    to.setHours(23);
    to.setMinutes(59);
    to.setSeconds(59);

    reportsRepo.getTotalUserBaseTillDate(from, to);
    await sleep(300 * 1000); // 5 minutes
    reportsRepo.getInactiveBaseHavingViewLogsLessThan3(from, to);
}



function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    generateDailyReport: generateDailyReport,
    generateEveryThreeDaysReports: generateEveryThreeDaysReports,
    generateWeeklyReports: generateWeeklyReports,
    generateMonthlyReports: generateMonthlyReports
}