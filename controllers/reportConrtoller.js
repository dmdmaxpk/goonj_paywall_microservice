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
        res.send(`Revenue for the date of ${today} is Rs. ${revenue}`);
    }else{
        res.send(`Failed to fetch revenue`);
    }
}

