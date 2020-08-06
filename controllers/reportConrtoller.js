const subscriptionService = require('../services/SubscriptionRenewalService');
const tokenRefreshService = require('../services/TokenRefreshService');
const tpsCountService = require('../services/TpsCountService');
const checkLastSeenOfUsersService = require('../services/CheckLastSeenOfUsers');
const grayListService = require('../services/GrayListService');
const affiliateReportsRepo = require('../repos/affiliateReportRepo');


const container = require("../configurations/container");
const billingHistoryRepo = container.resolve("billingHistoryRepository");


exports.gdn_report = async (req,res) =>  {
    affiliateReportsRepo.gdnReport(true);
    res.send("Affiliate GDN Manual Report Executed");
}

exports.rev_report = async (req,res) =>  {
    let today = new Date();
    today.setHours(00);
    today.setMinutes(00);
    today.setSeconds(00);

    let revenue = await billingHistoryRepo.getTodaysRevenue(today);
    console.log("=> ", revenue);
    if (revenue){
        res.send(`Revenue for the date of ${today} is Rs. ${revenue[0].total}`);
    }else{
        res.send(`Failed to fetch revenue`);
    }
}

exports.req_count = async (req,res) =>  {

    let data = [];

    let todayStart = new Date();
    todayStart.setHours(00);
    todayStart.setMinutes(00);
    todayStart.setSeconds(00);
    let todayEnd = new Date();

    let yesterdayStart = new Date();
    yesterdayStart.setDate(todayStart.getDate() - 1);
    yesterdayStart.setHours(00);
    yesterdayStart.setMinutes(00);
    yesterdayStart.setSeconds(00);

    let yesterdayEnd = new Date();
    yesterdayEnd.setDate(todayStart.getDate() - 1);

    let dayBeforeYesterdayStart = new Date();
    dayBeforeYesterdayStart.setDate(todayStart.getDate() - 2);
    dayBeforeYesterdayStart.setHours(00);
    dayBeforeYesterdayStart.setMinutes(00);
    dayBeforeYesterdayStart.setSeconds(00);


    let dayBeforeYesterdayEnd = new Date();
    dayBeforeYesterdayEnd.setDate(todayStart.getDate() - 2);

    let requests = await billingHistoryRepo.getRequests(todayStart, todayEnd);
    data.push({'Todays requests till the time': requests[0].sum});

    requests = await billingHistoryRepo.getRequests(yesterdayStart, yesterdayEnd);
    data.push({'Yesterdays requests till the time': requests[0].sum});

    requests = await billingHistoryRepo.getRequests(dayBeforeYesterdayStart, dayBeforeYesterdayEnd);
    data.push({'Day before yesterdays requests till the time': requests[0].sum});

    console.log("=> ", data);
    res.send(data);
}

