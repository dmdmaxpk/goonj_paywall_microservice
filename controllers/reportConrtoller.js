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


    let revenue = await billingHistoryRepo.getRevenueInDateRange(todayStart, todayEnd);
    data.push({'Todays revenue till the time': revenue[0].total});

    revenue = await billingHistoryRepo.getRevenueInDateRange(yesterdayStart, yesterdayEnd);
    data.push({'Yesterdays revenue till the time': revenue[0].total});

    revenue = await billingHistoryRepo.getRevenueInDateRange(dayBeforeYesterdayStart, dayBeforeYesterdayEnd);
    data.push({'Day before yesterday revenue till the time': revenue[0].total});

    console.log("=> ", revenue);
    res.send(data);
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

exports.billing_stats = async (req,res) =>  {

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

    let requests = await billingHistoryRepo.getBillingStats(todayStart, todayEnd);
    console.log("=> billing_stats ", requests);
    data.push({'Todays success requests till the time': requests[0].count});
    data.push({'Todays failed requests till the time': requests[1].count});

    requests = await billingHistoryRepo.getBillingStats(yesterdayStart, yesterdayEnd);
    console.log("=> billing_stats ", requests);
    data.push({'Yesterdays success requests till the time': requests[0].count});
    data.push({'Yesterdays failed requests till the time': requests[1].count});

    requests = await billingHistoryRepo.getBillingStats(dayBeforeYesterdayStart, dayBeforeYesterdayEnd);
    console.log("=> billing_stats ", requests);
    data.push({'Day before yesterdays success requests till the time': requests[0].count});
    data.push({'Day before yesterday failed requests till the time': requests[1].count});

    console.log("=> ", data);
    res.send(data);
}


