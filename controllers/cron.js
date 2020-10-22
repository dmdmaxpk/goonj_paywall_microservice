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
const BillingHistoryRepository = require("../repos/BillingHistoryRepo");
const billingHistoryRepo = new BillingHistoryRepository();
const axios = require('axios');
const userRepo = container.resolve("userRepository");


const subscriptionRepository = container.resolve("subscriptionRepository");

const viewLogsRepo = require('../repos/ViewLogRepo');
const UserRepository = require("../repos/UserRepo");

exports.subscriptionRenewal = async (req,res) =>  {
    await subscriptionService.subscriptionRenewal();
    res.send("Subscription renewal - Executed");
}

exports.refreshToken = async (req,res) =>  {
    await tokenRefreshService.refreshToken();
    res.send("Token Refresh - Executed");
}

exports.purgeDueToInActivity = async (req,res) =>  {
    res.send("PurgeDueToInActivity - Executed\n");
    let from = new Date();
    from.setDate(from.getDate() - 60);

    let to = new Date();
    let lastSixtyDaysChargedUsers = await billingHistoryRepo.getLastSixtyDaysChargedUsers(from, to);
    console.log("=> lastSixtyDaysChargedUsers ", lastSixtyDaysChargedUsers.length);

    let purgeCount = 0;
    let notPurgeCount = 0;
    let notFound = 0;

    let purgerIds = [];

    for(let i = 0; i < lastSixtyDaysChargedUsers.length; i++){
        let latestViewLog = await viewLogsRepo.getLatestViewLog(lastSixtyDaysChargedUsers[i]._id);
        if(latestViewLog){
            let latestDtm = new Date(latestViewLog.added_dtm);

            if(latestDtm.getTime() < from.getTime()){
                // Means, this user should be purged;
                console.log("=> Purge:", latestViewLog.user_id);
                purgeCount += 1;
                purgerIds.push(latestViewLog.user_id);
            }else{
                // No need to purge
                console.log("=> Don't Purge:", latestViewLog.user_id);
                notPurgeCount += 1;
            }
        }else{
            console.log("=> Record not found", lastSixtyDaysChargedUsers[i]._id);
            notFound += 1;
        }
    }

    try{
        console.log("=>", purgerIds);
        let data = await userRepo.updateMany(purgerIds);
        console.log("=> data", data);

        console.log("=> Purge Count: ", purgeCount);
        console.log("=> Not Purge Count: ", notPurgeCount);
        console.log("=> Not Found Count: ", notFound);
    }catch(err){
        console.log("=> purgerIds - error", err);
    }
    
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

exports.rabbitMqMonitoring = async (req,res) =>  {
    await monitorRabbitMq();
    res.send("### rabbitMqMonitoring - Executed");
}

monitorRabbitMq = async() => {
    axios({method: 'get',url: 'http://127.0.0.1:15672/api/overview'})
    .then(function(response){
        response = response.data;
        console.log('###', JSON.stringify(response));
        //let deliveryRate = response.message_stats.deliver_get.rate;
    }).catch(function(err){
        console.log("### error", err);
    });
}