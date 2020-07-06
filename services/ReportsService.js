const reportsRepo = require('../repos/ReportsRepo');
const affiliateReportsRepo = require('../repos/affiliateReportRepo');
const subscriberRepo = require('../repos/SubscriberRepo');

generateDailyReport = async() => {
    
    let from = new Date();
    from.setDate(from.getDate() - 1);
    from.setHours(0);
    from.setMinutes(0);
    from.setSeconds(0);

    var to = new Date();
    to.setHours(00);
    to.setMinutes(00);
    to.setSeconds(05);
    
    console.log("=> Generating daily reports");

    //reportsRepo.dailyReport();

    // //Unsub Zara's number daily
    // await subscriberRepo.removeNumberAndHistory('03458561755');
    
    //await sleep(120*1000);
    //reportsRepo.callBacksReport();
    
    // await sleep(120*1000);
    // reportsRepo.dailyUnsubReport();
    
    // await sleep(120*1000);
    // reportsRepo.errorCountReport();
    
    // await sleep(120*1000);
    // reportsRepo.dailyFullAndPartialChargedUsers();
    
    // await sleep(120*1000);
    // reportsRepo.dailyTrialToBilledUsers();
    
    // await sleep(120*1000);
    // reportsRepo.dailyChannelWiseUnsub();

    // await sleep(120*1000);
    // reportsRepo.dailyChannelWiseTrialActivated();

    // await sleep(120*1000);
    // reportsRepo.dailyPageViews();

    // await sleep(120*1000);
    // affiliateReportsRepo.gdnReport(false);

    reportsRepo.dailyNetAddition(from, to);
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