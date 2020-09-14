const container = require("../configurations/container");
const removeDuplicateMsisdns = container.resolve("removeDuplicateMsisdns");
const subscriptionService = require('../services/SubscriptionRenewalService');
const tokenRefreshService = require('../services/TokenRefreshService');
const tpsCountService = require('../services/TpsCountService');
const checkLastSeenOfUsersService = require('../services/CheckLastSeenOfUsers');
const grayListService = require('../services/GrayListService');
const reportsService = require('../services/ReportsService');
const billingMonitoringService = require('../services/BillingMonitoringService');
const messageService = require('../services/MessageService');
const subscriptionRepository = container.resolve("subscriptionRepository");

exports.subscriptionRenewal = async (req,res) =>  {
    await subscriptionService.subscriptionRenewal();
    res.send("Subscription renewal - Executed");
}

exports.refreshToken = async (req,res) =>  {
    await tokenRefreshService.refreshToken();
    res.send("Token Refresh - Executed");
}

exports.addInBillingQueue = async (req,res) =>  {
    let subscription_id = req.query.subscription_id;
    console.log(subscription_id, '1');
    let subscription = await subscriptionRepository.getSubscription(subscription_id);
    console.log(subscription_id, '2');
    await subscriptionService.addSubscription(subscription);
    res.send("addInBillingQueue - Executed\n");
}

exports.dailyAmoutReset = async (req,res) =>  {
    await tpsCountService.dailyAmountReset();
    // await checkLastSeenOfUsersService.checkLastSeenOfUsers();
    res.send("DailyAmoutReset - Executed");
}

exports.tpsCountReset = async (req,res) =>  {
    await tpsCountService.tpsCountReset();
    res.send("TpsCountReset - Executed");
}

exports.checkLastSeenOfUsers = async (req,res) =>  {
    // await checkLastSeenOfUsersService.checkLastSeenOfUsers();
    res.send("CheckLastSeenOfUsers - Executed");
}

exports.grayListService = async (req,res) =>  {
    await grayListService.checkForUngrayListUsers();
    res.send("GrayListService - Executed");
}

exports.generateDailyReport = async (req,res) =>  {
    reportsService.generateDailyReport();
    res.send("GenerateDailyReport - Executed\n");
}

exports.generateWeeklyReports = async (req,res) =>  {
    reportsService.generateWeeklyReports();
    res.send("GenerateWeeklyReport - Executed\n");
}

exports.generateMonthlyReports = async (req,res) =>  {
    reportsService.generateMonthlyReports();
    res.send("GenerateMonthlyReports - Executed\n");
}

exports.generateRandomReports = async (req,res) =>  {
    reportsService.generateRandomReports();
    res.send("GenerateRandomReports - Executed\n");
}

exports.hourlyBillingReport = async (req,res) =>  {
    await billingMonitoringService.billingInLastHour();
    res.send("hourlyBillingReport - Executed");
}

exports.markRenewableUsers = async (req,res) =>  {
    console.log("Marking renewable users")
    await subscriptionService.markRenewableUser();
    res.send("markRenewableUser - Executed");
}

exports.sendReportsEveryThreeDays = async (req,res) =>  {
    console.log("sendReportsEveryThreeDays")
    await reportsService.generateEveryThreeDaysReports();
    res.send("markRenewableUser - Executed");
}

exports.sendReportsEveryWeek = async (req,res) =>  {
    console.log("sendReportsEveryWeek")
    await reportsService.generateWeeklyReports();
    res.send("sendReportsEveryWeek - Executed");
}

exports.sendReportsEveryMonth = async (req,res) =>  {
    console.log("sendReportsEveryMonth")
    await reportsService.generateMonthlyReports();
    res.send("sendReportsEveryMonth - Executed");
}

exports.removeDuplicateMsisdns = async (req,res) =>  {
    console.log("=> removeDuplicateMsisdns")
    removeDuplicateMsisdns.removeDuplicateMsisdns();
    res.send("removeDuplicateMsisdns - Executed\n");
}