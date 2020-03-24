const subscriptionService = require('../services/SubscriptionRenewalService');
const tokenRefreshService = require('../services/TokenRefreshService');
const tpsCountService = require('../services/TpsCountService');
const checkLastSeenOfUsersService = require('../services/CheckLastSeenOfUsers');
const grayListService = require('../services/GrayListService');
const reportsService = require('../services/ReportsService');
const billingMonitoringService = require('../services/BillingMonitoringService');
const messageService = require('../services/MessageService');

exports.subscriptionRenewal = async (req,res) =>  {
    await subscriptionService.subscriptionRenewal();
    res.send("Subscription renewal - Executed");
}

exports.postPSLUserMigration = async (req,res) =>  {
    await messageService.changePackageOfUsers();
    res.send("POST PSL User Migration - Executed");
}

exports.postPSLOnlyUserMigration = async (req,res) =>  {
    await messageService.changePackageOfPSLOnlyUsers();
    res.send("POST PSL Only User Migration - Executed");
}

exports.refreshToken = async (req,res) =>  {
    await tokenRefreshService.refreshToken();
    res.send("Token Refresh - Executed");
}

exports.dailyAmoutReset = async (req,res) =>  {
    await tpsCountService.dailyAmountReset();
    res.send("DailyAmoutReset - Executed");
}

exports.tpsCountReset = async (req,res) =>  {
    await tpsCountService.tpsCountReset();
    res.send("TpsCountReset - Executed");
}

exports.checkLastSeenOfUsers = async (req,res) =>  {
    await checkLastSeenOfUsersService.checkLastSeenOfUsers();
    res.send("CheckLastSeenOfUsers - Executed");
}

exports.grayListService = async (req,res) =>  {
    await grayListService.checkForUngrayListUsers();
    res.send("GrayListService - Executed");
}

exports.generateDailyReport = async (req,res) =>  {
    await reportsService.generateDailyReport();
    res.send("GenerateDailyReport - Executed");
}

exports.hourlyBillingReport = async (req,res) =>  {
    await billingMonitoringService.billingInLastHour();
    res.send("hourlyBillingReport - Executed");
}