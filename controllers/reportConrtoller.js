const subscriptionService = require('../services/SubscriptionRenewalService');
const tokenRefreshService = require('../services/TokenRefreshService');
const tpsCountService = require('../services/TpsCountService');
const checkLastSeenOfUsersService = require('../services/CheckLastSeenOfUsers');
const grayListService = require('../services/GrayListService');
const affiliateReportsRepo = require('../repos/affiliateReportRepo');

const container = require("../configurations/container");
const billingHistoryRepo = container.resolve("billingHistoryRepository");
const revenueStatisticsService = container.resolve("revenueStatisticsService");
const helper = require('../helper/helper');
const  _ = require('lodash');

exports.gdn_report = async (req,res) =>  {
    affiliateReportsRepo.gdnReport(true);
    res.send("Affiliate GDN Manual Report Executed");
}

exports.rev_report = async (req,res) =>  {
    console.log('*************   rev_report   *****************');

    let data = [];
    let serverDate = new Date();
    let localDate = helper.setDateWithTimezone(serverDate);
    console.log('serverDate: ', serverDate);
    console.log('localDate: ', localDate);

    let todayStart = _.clone(localDate);
    todayStart.setHours(00);
    todayStart.setMinutes(00);
    todayStart.setSeconds(00);
    let todayEnd = _.clone(localDate);

    let yesterdayStart = new Date();
    yesterdayStart.setDate(serverDate.getDate() - 1);
    yesterdayStart.setHours(00);
    yesterdayStart.setMinutes(00);
    yesterdayStart.setSeconds(00);

    let yesterdayEnd = new Date();
    yesterdayEnd.setDate(serverDate.getDate() - 1);

    let dayBeforeYesterdayStart = new Date();
    dayBeforeYesterdayStart.setDate(serverDate.getDate() - 2);
    dayBeforeYesterdayStart.setHours(00);
    dayBeforeYesterdayStart.setMinutes(00);
    dayBeforeYesterdayStart.setSeconds(00);


    let dayBeforeYesterdayEnd = new Date();
    dayBeforeYesterdayEnd.setDate(serverDate.getDate() - 2);


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
    console.log('*************   req_count   *****************');

    let data = [];
    let serverDate = new Date();
    let localDate = helper.setDateWithTimezone(serverDate);
    console.log('serverDate: ', serverDate);
    console.log('localDate: ', localDate);

    let todayStart = _.clone(localDate);
    todayStart.setHours(00);
    todayStart.setMinutes(00);
    todayStart.setSeconds(00);
    let todayEnd = _.clone(localDate);

    let yesterdayStart = new Date();
    yesterdayStart.setDate(serverDate.getDate() - 1);
    yesterdayStart.setHours(00);
    yesterdayStart.setMinutes(00);
    yesterdayStart.setSeconds(00);

    let yesterdayEnd = new Date();
    yesterdayEnd.setDate(serverDate.getDate() - 1);

    let dayBeforeYesterdayStart = new Date();
    dayBeforeYesterdayStart.setDate(serverDate.getDate() - 2);
    dayBeforeYesterdayStart.setHours(00);
    dayBeforeYesterdayStart.setMinutes(00);
    dayBeforeYesterdayStart.setSeconds(00);


    let dayBeforeYesterdayEnd = new Date();
    dayBeforeYesterdayEnd.setDate(serverDate.getDate() - 2);

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
    data.push({'Todays success requests till the time': requests[0].count, 'Todays failed requests till the time': requests[1].count});

    requests = await billingHistoryRepo.getBillingStats(yesterdayStart, yesterdayEnd);
    data.push({'Yesterdays success requests till the time': requests[0].count, 'Yesterdays failed requests till the time': requests[1].count});

    requests = await billingHistoryRepo.getBillingStats(dayBeforeYesterdayStart, dayBeforeYesterdayEnd);
    data.push({'Day before yesterdays success requests till the time': requests[0].count, 'Day before yesterday failed requests till the time': requests[1].count});

    console.log("=> ", data);
    res.send(data);
}

exports.revenue_stats = async (req,res) =>  {
    console.log('*************   revenue_stats   *****************');

    let revenueStats = [];
    let serverDate = new Date();
    let localDate = helper.setDateWithTimezone(serverDate);

    let today = _.clone(localDate);
    today.setHours(00);
    today.setMinutes(00);
    today.setSeconds(00);
    console.log('today: ', today);

    console.log('req.query.day: ', req.query.day);
    if (req.query.day === 'today'){
        console.log('today******************: ');

        //Today - Start and end date
        let todayStart = _.clone(localDate);
        let todayEnd = _.clone(localDate);

        todayStart.setHours(00);
        todayStart.setMinutes(00);
        todayStart.setSeconds(00);
        revenueStats = await revenueStatisticsService.getRevenueStatsDateWise(todayStart, todayEnd);
        console.log('todayRevenueStats: ', revenueStats);
    }
    else if(req.query.day === 'yesterday'){
        console.log('yesterday*****************: ');

        //Yesterday - Start and end date
        let yesterdayStart = new Date();
        let yesterdayEnd = new Date();

        yesterdayStart.setDate(serverDate.getDate() - 1);
        yesterdayStart.setHours(00);
        yesterdayStart.setMinutes(00);
        yesterdayStart.setSeconds(00);
        yesterdayEnd.setDate(serverDate.getDate() - 1);
        revenueStats = await revenueStatisticsService.getRevenueStatsDateWise(yesterdayStart, yesterdayEnd);
        console.log('yesterdayRevenueStats: ', revenueStats);
    }
    else if(req.query.day === 'datBeforeYesterday'){
        console.log('datBeforeYesterday******************: ');

        //A day before Yesterday - Start and end date
        let dayBeforeYesterdayStart = new Date();
        let dayBeforeYesterdayEnd = new Date();

        dayBeforeYesterdayStart.setDate(serverDate.getDate() - 2);
        dayBeforeYesterdayStart.setHours(00);
        dayBeforeYesterdayStart.setMinutes(00);
        dayBeforeYesterdayStart.setSeconds(00);
        dayBeforeYesterdayEnd.setDate(serverDate.getDate() - 2);
        revenueStats = await revenueStatisticsService.getRevenueStatsDateWise(dayBeforeYesterdayStart, dayBeforeYesterdayEnd);
        console.log('dayBeforeYesterdayRevenueStats - stringify: ', revenueStats);
    }

    console.log('revenueStats: ', revenueStats);
    res.send({code: 1, data: revenueStats});
};
