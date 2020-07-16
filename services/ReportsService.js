const reportsRepo = require('../repos/ReportsRepo');
const affiliateReportsRepo = require('../repos/affiliateReportRepo');
const subscriberRepo = require('../repos/SubscriberRepo');

generateDailyReport = async() => {
    
    console.log("=> Generating daily reports");

    //Yesterday
    var to = new Date();
    to.setDate(to.getDate() - 1);
    to.setHours(23);
    to.setMinutes(59);
    to.setSeconds(59);

    //Day before yesterday
    var from = new Date();
    from.setDate(to.getDate() - 1);
    from.setHours(00);
    from.setMinutes(00);
    from.setSeconds(00);

    
    // Revenue report
    reportsRepo.dailyReport();

    // //Unsub Zara's number daily
    // await subscriberRepo.removeNumberAndHistory('03458561755');
    
    await sleep(180*1000);
    reportsRepo.callBacksReport();

    await sleep(180*1000);
    reportsRepo.dailyReturningUsers(from, to);
    
    await sleep(120*1000);
    reportsRepo.dailyUnsubReport();

    //await sleep(120*1000);
    //reportsRepo.errorCountReport();
    
    await sleep(120*1000);
    reportsRepo.dailyFullAndPartialChargedUsers();
    
    //await sleep(120*1000);
    //reportsRepo.dailyTrialToBilledUsers();
    
    await sleep(120*1000);
    reportsRepo.dailyChannelWiseUnsub();

    
    await sleep(120*1000);
    reportsRepo.dailyChannelWiseTrialActivated();

    await sleep(120*1000);
    reportsRepo.dailyPageViews();

    // await sleep(120*1000);
    // affiliateReportsRepo.gdnReport(false);
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

    //reportsRepo.dailyNetAddition(from, to);
    
    //await sleep(300 * 1000); // 5 minutes
    //reportsRepo.avgTransactionPerCustomer(from, to);
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