const mongoose = require('mongoose');
const readline = require('readline');
const container = require("../configurations/container");
const Subscription = mongoose.model('Subscription');
const BillingHistory = mongoose.model('BillingHistory');
const User = mongoose.model('User');

const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const csvParser = require('csv-parser');

const billinghistoryRepo = container.resolve('billingHistoryRepository');
const subscriptionRepo = container.resolve('subscriptionRepository');
const subscriberRepo = container.resolve('subscriberRepository');

var nodemailer = require('nodemailer');
var usersRepo = container.resolve('userRepository');
var viewLogsRepo = require('../repos/ViewLogRepo');

var pageViews = require('../controllers/PageViews');
const path = require('path');


let currentDate = null;
currentDate = getCurrentDate();

let paywallTotalBase = currentDate+"_PaywallTotalBase.csv";
let paywallTotalBaseFilePath = `./${paywallTotalBase}`;

let ActiveBase = currentDate+"_ActiveBase.csv";
let ActiveBaseFilePath = `./${ActiveBase}`;

let paywallExpiredBase = currentDate+"_PaywallExpiredBase.csv";
let paywallExpiredBaseFilePath = `./${paywallExpiredBase}`;

let paywallInActiveBase = currentDate+"_PaywallInActiveBase.csv";
let paywallInActiveBaseFilePath = `./${paywallInActiveBase}`;

let paywallRevFileName = currentDate+"_PaywallRevReport.csv";
let paywallRevFilePath = `./${paywallRevFileName}`;

let paywallUnsubReport = currentDate+"_UnsubReport.csv";
let paywallUnsubFilePath = `./${paywallUnsubReport}`;

let paywallChannelWiseUnsubReport = currentDate+"_ChannelWiseUnsub.csv";
let paywallChannelWiseUnsubReportFilePath = `./${paywallChannelWiseUnsubReport}`;

let paywallChannelWiseTrial = currentDate+"_ChannelWiseTrial.csv";
let paywallChannelWiseTrialFilePath = `./${paywallChannelWiseTrial}`;

let paywallErrorCountReport = currentDate+"_ErrorCountReport.csv";
let paywallErrorCountFilePath = `./${paywallErrorCountReport}`;

let paywallErrorCountReportBySource = currentDate+"_ErrorCountReportBySource.csv";
let paywallErrorCountBySourceFilePath = `./${paywallErrorCountReportBySource}`;

let paywallFullAndPartialChargedReport = currentDate+"_FullAndPartialCharged.csv";
let paywallFullAndPartialChargedReportFilePath = `./${paywallFullAndPartialChargedReport}`;

let paywallCallbackReport = currentDate+"_CallbackReport.csv";
let paywallCallbackFilePath = `./${paywallCallbackReport}`;

let paywallTrialToBilledUsers = currentDate+"_TrialToBilled.csv";
let paywallTrialToBilledUsersFilePath = `./${paywallTrialToBilledUsers}`;

let affiliatePvs = currentDate+"_AffiliatePageViews.csv";
let affiliatePvsFilePath = `./${affiliatePvs}`;

let dailyNetAdditionCsv = currentDate+"_DailyNetAdditions.csv";
let dailyNetAdditionFilePath = `./${dailyNetAdditionCsv}`;

let usersReportWithTrialAndBillingHistory = currentDate+"_UsersReportWithTrialAndBillingHistory.csv";
let usersReportWithTrialAndBillingHistoryFilePath = `./${usersReportWithTrialAndBillingHistory}`;

let dateWiseChargingDetails = currentDate+"_DateWiseChargingDetails.csv";
let dateWiseChargingDetailsFilePath = `./${dateWiseChargingDetails}`;
let dateWiseChargingDetailsWriter = createCsvWriter({
    path: dateWiseChargingDetailsFilePath,
    header: [
        {id: 'date', title: 'Date'},
        {id: "count",title: "Billing Count" }
    ]
});



let randomReport = currentDate+"_RandomReport.csv";
let randomReportFilePath = `./${randomReport}`;

const csvWriter = createCsvWriter({
    path: paywallRevFilePath,
    header: [
        {id: 'date', title: 'Date'},
        {id: 'newUser', title: 'Number Verified Users'},
        {id: 'newSubscriber', title: 'New Subscribers'},
        {id: 'totalSubscribers', title: 'Total Subscribers'},
        {id: 'trials', title: 'Trials Activated'},
        {id: 'tempTotalActiveSubscribers',title: 'Total Active Subscribers'},

        {id: 'liveOnlyCount', title: 'Live Daily'},
        {id: 'liveWeeklyCount', title: 'Live Weekly'},
        {id: 'comedyOnlyCount', title: 'Comedy Daily'},
        {id: 'comedyWeeklyCount', title: 'Comedy Weekly'},

        {id: 'liveOnlyRevenue', title: 'Live Daily Revenue'},
        {id: 'liveWeeklyRevenue', title: 'Live Weekly Revenue'},
        {id: 'comedyOnlyRevenue', title: 'Comedy Daily Revenue'},
        {id: 'comedyWeeklyRevenue', title: 'Comedy Weekly Revenue'},
        {id: 'totalRevenue',title: 'Total Revenue'}

    ]
});

const monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const dailyNetAdditionWriter = createCsvWriter({
    path: dailyNetAdditionFilePath,
    header: [
        {id: 'date', title: 'Date'},
        {id: 'subs', title: 'Subscriptions'},
        {id: "unsubs",title: "Un-Subscriptions" },
        {id: "net",title: "Net Subscriptions" },
    ]
});

const csvReportWriter = createCsvWriter({
    path: paywallCallbackFilePath,
    header: [
        {id: 'tid', title: 'TID'},
        {id: 'mid', title: 'MID'},
        {id: "isValidUser",title: "Is Valid Telenor User" },
        {id: "isCallbAckSent",title: "IS CallBack Sent" },
        {id: 'added_dtm', title: 'User TIMESTAMP'},
        {id: 'callBackSentTime', title: 'TIMESTAMP'}
    ]
});

const csvTotalBase = createCsvWriter({
    path: paywallTotalBaseFilePath,
    header: [
        {id: 'msisdn', title: 'Msisdn'},
    ]
});

const csvExpiredBase = createCsvWriter({
    path: paywallExpiredBaseFilePath,
    header: [
        {id: 'msisdn', title: 'Msisdn'},
    ]
});

const csvInActiveBase = createCsvWriter({
    path: paywallInActiveBaseFilePath,
    header: [
        {id: 'msisdn', title: 'Msisdn'},
    ]
});

const ActiveBaseWriter = createCsvWriter({
    path: ActiveBaseFilePath,
    header: [
        {id: 'msisdn', title: 'Msisdn'},
    ]
});

const csvFullAndPartialCharged = createCsvWriter({
    path: paywallFullAndPartialChargedReportFilePath,
    header: [
        {id: 'date', title: 'Date'},
        {id: 'fully_charged_users', title: 'Fully Charged Users'},
        {id: "partially_charged_users",title: "Partially Charged Users" },
        {id: 'total', title: 'Total'}
    ]
});

const csvTrialToBilledUsers = createCsvWriter({
    path: paywallTrialToBilledUsersFilePath,
    header: [
        {id: 'trial_date', title: 'Trial Activation Date'},
        {id: 'billed_date', title: "Successfull Billing Date"},
        //{id: 'msisdn', title: 'List of MSISDNs'},
        {id: 'total', title: 'Total Count'}
    ]
});

const randomReportWriter = createCsvWriter({
    path: randomReportFilePath,
    header: [
        {id: 'msisdn', title: 'Msisdn'},
        {id: 'acquisition_source', title: 'Acquisition Source'},
        {id: 'acquisition_date', title: 'Acquisition Date'},
        {id: 'number_of_success_charging', title: 'Number of Success Charging'},
        {id: "dou",title: "DOU" }
    ]
});

const csvAffiliatePvs = createCsvWriter({
    path: affiliatePvsFilePath,
    header: [
        {id: 'date', title: 'Date'},
        {id: 'source',title: "Source"},
        {id: 'mid',title: "MID"},
        {id: 'count', title: "Page Views"},
    ]
});

const usersReportWithTrialAndBillingHistoryWriter = createCsvWriter({
    path: usersReportWithTrialAndBillingHistoryFilePath,
    header: [
        {id: 'mid', title: 'Mid'},
        {id: 'user_id',title: "Auto Generated Id"},
        {id: 'code',title: "Code"},
        {id: 'success_transactions', title: "Success Transactions"},
        {id: 'amount', title: "Amount"},
    ]
});

var transporter = nodemailer.createTransport({
    host: "mail.dmdmax.com.pk",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: 'reports@goonj.pk', // generated ethereal user
      pass: 'YiVmeCPtzJn39Mu' // generated ethereal password
    }
});

generateReportForAcquisitionSourceAndNoOfTimeUserBilled = async() => {
    console.log("=> generateReportForAcquisitionSourceAndNoOfTimeUserBilled");
    let finalResult = [];

    try{
        var jsonPath = path.join(__dirname, '..', 'msisdns.txt');
        let inputData = await readFileSync(jsonPath);    
        console.log("### Input Data Length: ", inputData.length);

        for(let i = 0; i < inputData.length; i++){
            if(inputData[i] && inputData[i].length === 11){
                let singObject = {
                    msisdn: inputData[i]
                }

                let user = await usersRepo.getUserByMsisdn(inputData[i]);
                if(user){
                    let dou = await viewLogsRepo.getDaysOfUse(user._id);
                    if(dou && dou.length > 0){
                        singObject.dou = dou[0].count;
                    }else{
                        singObject.dou = 0;
                    }

                    let subscriber = await subscriberRepo.getSubscriberByUserId(user._id);
                    if(subscriber){
                        let subscriptions = await subscriptionRepo.getAllSubscriptions(subscriber._id);
                        if(subscriptions && subscriptions.length > 0){
                            let addedDtm = subscriptions[0].added_dtm;
                            let totalSuccessTransactions = 0;
                            
                            for(let sub = 0; sub < subscriptions.length; sub++){
                                totalSuccessTransactions += subscriptions[sub].total_successive_bill_counts;
                            }

                            singObject.acquisition_date = addedDtm;
                            singObject.number_of_success_charging = totalSuccessTransactions;

                            if(subscriptions[0].affiliate_mid){
                                singObject.acquisition_source = subscriptions[0].affiliate_mid;
                            }else{
                                singObject.acquisition_source = subscriptions[0].source;
                            }

                            finalResult.push(singObject);
                            console.log("### Done ", i);

                        }else{
                            console.log("### No subscriptions found for", inputData[i]);    
                        }
                    }else{
                        console.log("### No subscriber found for", inputData[i]);    
                    }
                }else{
                    console.log("### No user found for", inputData[i]);
                }
            }else{
                console.log("### Invalid number or number length");
            }
        }
    
        console.log("### Sending email");
        await randomReportWriter.writeRecords(finalResult);
        let info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk',
            to:  ["farhan.ali@dmdmax.com"],
            subject: `Complaint Data`, // Subject line
            text: `This report contains the details of msisdns being sent us over email from Zara`,
            attachments:[
                {
                    filename: randomReport,
                    path: randomReportFilePath
                }
            ]
        });
    
        console.log("###  [randomReport][emailSent]",info);
        fs.unlink(randomReportFilePath,function(err,data) {
            if (err) {
                console.log("###  File not deleted[randomReport]");
            }
            console.log("###  File deleted [randomReport]");
        });
    }catch(e){
        console.log("### error - ", e);
    }
}

readFileSync = async (jsonPath) => {
    return new Promise((resolve, reject) => {
        try{
            const readInterface = readline.createInterface({
                input: fs.createReadStream(jsonPath)
            });
            let inputData = [];
            let counter = 0;
            readInterface.on('line', function(line) {
                line = line.replace('92', '0');
                inputData.push(line);
                counter += 1;
                console.log("### read", counter);
            });
    
            readInterface.on('close', function(line) {
                resolve(inputData);
            });
        }catch(e){
            reject(e);
        }
    });
}

dailyReport = async(mode = 'prod') => {

    let resultToWriteToCsv= [];

    try{
        console.log("=> dailyReport");
        let today = new Date();
        let myToday = new Date(today.getFullYear(),today.getMonth(),today.getDate(),0,0,0);

        let dayBeforeYesterday = new Date(today.getFullYear(),today.getMonth(),today.getDate(),0,0,0);
        dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 1);
        let reportStartDate = new Date("2020-02-07T00:00:00.672Z");
        let susbcriberStats = await Subscription.aggregate([
            {
                "$match": 
                {
                    "added_dtm": { "$gte": reportStartDate ,$lt: myToday  },
                    "active": true
                }
            },
            {$group: {_id: {"day": {"$dayOfMonth" : "$added_dtm"}, "month": { "$month" : "$added_dtm" },"year":{ $year: "$added_dtm" } } , count:{ $sum: 1 } } },
            {$project: {  "date":{"$dateFromParts":{ year: "$_id.year","month":"$_id.month","day":"$_id.day" }}, "count": "$count",_id:-1 }} ,
            { $sort: {"date": -1}}
        ]);

        console.log("=> dailyReport 1");
        
        let subscription_status_stats = await Subscription.aggregate([
            {
                "$match": 
                {
                    "added_dtm": { "$gte": reportStartDate ,$lt: myToday  },
                    active:true
                }
            },
            {$group: {_id: {subscription_status: "$subscription_status" } , count:{ $sum: 1 } } },
            {$project: {  "count": "$count",_id: 1 }} ,
            { $sort: {"date": -1}}
        ]);

        console.log("=> dailyReport 2");

        let totalActiveSubscribers = subscription_status_stats.reduce((accum,elem) => {
            if (elem._id.subscription_status === "trial" || elem._id.subscription_status === "graced" || elem._id.subscription_status === "billed") {
                return accum = accum + elem.count; 
            }
            return accum;
        },0);

        console.log("=> dailyReport 3");

        let userStats = await User.aggregate([
                {
                    "$match": 
                    {
                        "added_dtm": { "$gte": reportStartDate ,$lt: myToday  },
                        active:true,
                        operator:"telenor"
                    }
                },
            {$group: {_id: {"day": {"$dayOfMonth" : "$added_dtm"}, "month": { "$month" : "$added_dtm" },
            "year":{ $year: "$added_dtm" }} , count:{ $sum: 1 } } },
            {$project: {  "date":{"$dateFromParts":{ year: "$_id.year","month":"$_id.month","day":"$_id.day" }}, "count": "$count",_id:-1 }},
            {$sort: {"date": -1}} 
        ]);

        console.log("=> dailyReport 4");

        let totalUserStats = await User.countDocuments({ "added_dtm": { "$gte": reportStartDate ,$lt: myToday  },active:true } );
        console.log("=> dailyReport 4.1");
        let totalSubscriberStats = await Subscription.countDocuments({ "added_dtm": { "$gte": reportStartDate ,$lt: myToday  },active:true } );
        console.log("=> dailyReport 4.2 - ", totalSubscriberStats);
        let totalExpiredCount = await BillingHistory.countDocuments({"billing_dtm": { "$gte": reportStartDate ,$lt: myToday  },billing_status: "expired"} );
        console.log("=> dailyReport 5 - ", totalExpiredCount);

        let billingStats = await BillingHistory.aggregate([
                { $match: { "billing_status": {$in : ["Success","expired"]}, "billing_dtm": { "$gte": reportStartDate ,$lt: myToday  } } },
                {$group: {_id: {"day": {"$dayOfMonth" : "$billing_dtm"}, "month": { "$month" : "$billing_dtm" },
                    "year":{ $year: "$billing_dtm" },billing_status: "$billing_status",package_id: "$package_id" } , revenue:{ $sum: "$price" },count:{$sum: 1} } },
                {$project: {  "date":{"$dateFromParts":{ year: "$_id.year","month":"$_id.month","day":"$_id.day" }},
                    "revenue": "$revenue","count":"$count",_id:-1 }},{$sort: {"date": -1}}
        ]);
        
        console.log("=> dailyReport 6");
        
        let trialStats = await BillingHistory.aggregate([
            { $match: { "billing_status": "trial","billing_dtm": { "$gte": reportStartDate ,$lt: myToday  }  } },
            {$group: {_id: {"day": {"$dayOfMonth" : "$billing_dtm"}, "month": { "$month" : "$billing_dtm" },
                "year":{ $year: "$billing_dtm" } } , trials:{ $sum: 1 } } },
            {$project: {  "date":{"$dateFromParts":{ year: "$_id.year","month":"$_id.month","day":"$_id.day" }}, 
                "trials": "$trials",_id:-1 }},{$sort: {"date": -1}}
        ]);
        
        console.log("=> dailyReport 7");

        let resultToWrite = {};
        userStats.forEach(userStat => {
            if(userStat.date){
                resultToWrite[userStat.date.toDateString()] =  {};
            }
        });

        console.log("=> dailyReport 8");

        let totalUsers = totalUserStats;
        userStats.forEach(userStat => {
            if(userStat.date){
                resultToWrite[userStat.date.toDateString()]['newUser'] = userStat.count;
                totalUsers = totalUsers - userStat.count;
                resultToWrite[userStat.date.toDateString()]['totalUsers'] = totalUsers;
            }
        });

        console.log("=> dailyReport 9");

        var totalSubscriber = totalSubscriberStats;
        susbcriberStats.forEach(subsc => {
            if(subsc.date){
                resultToWrite[subsc.date.toDateString()]['newSubscriber'] = subsc.count;
                totalSubscriber = totalSubscriber - subsc.count;
                resultToWrite[subsc.date.toDateString()]['totalSubscribers'] = totalSubscriber;
            }
        });

        console.log("=> dailyReport 10");

        let totalExpiredCountt = totalExpiredCount;

        billingStats.forEach(billingHistor => {
            // console.log(billingHistor);
            if(resultToWrite[billingHistor.date.toDateString()] && billingHistor._id["billing_status"] === "Success") {
                console.log("billingHistor",billingHistor);
                if (billingHistor._id.package_id === "QDfC") {
                    resultToWrite[billingHistor.date.toDateString()]['revenue-liveonly'] = billingHistor.revenue;
                    resultToWrite[billingHistor.date.toDateString()]['users-billed-liveonly'] = billingHistor.count;
                }
                if (billingHistor._id.package_id === "QDfG") {
                    resultToWrite[billingHistor.date.toDateString()]['revenue-liveweekly'] = billingHistor.revenue;
                    resultToWrite[billingHistor.date.toDateString()]['users-billed-liveweekly'] = billingHistor.count;
                }
                if (billingHistor._id.package_id === "QDfH") {
                    resultToWrite[billingHistor.date.toDateString()]['revenue-comedyonly'] = billingHistor.revenue;
                    resultToWrite[billingHistor.date.toDateString()]['users-billed-comedyonly'] = billingHistor.count;
                }
                if (billingHistor._id.package_id === "QDfI") {
                    resultToWrite[billingHistor.date.toDateString()]['revenue-comedyweekly'] = billingHistor.revenue;
                    resultToWrite[billingHistor.date.toDateString()]['users-billed-comedyweekly'] = billingHistor.count;
                }
            } else if (resultToWrite[billingHistor.date.toDateString()] && billingHistor._id["billing_status"] === "expired")  {
                console.log("[dailyReport]expired On the day",billingHistor.count);
                console.log("[dailyReport]date",billingHistor.date.toDateString());
                totalExpiredCountt = totalExpiredCountt - billingHistor.count;
                console.log("[dailyReport]totalExpiredCountt",totalExpiredCountt);
                resultToWrite[billingHistor.date.toDateString()]['users_expired'] = billingHistor.count;
                resultToWrite[billingHistor.date.toDateString()]['users_expired_till_today'] = totalExpiredCountt;
            }
        });
        console.log("=> dailyReport 11");

        trialStats.forEach(trialStat => {
            if(resultToWrite[trialStat.date.toDateString()]) {
                resultToWrite[trialStat.date.toDateString()]['trials'] = trialStat.trials;
            }
        });

        console.log("=> dailyReport 12");

        // console.log("myDate",dayBeforeYesterday.toDateString());
        // console.log("myToday",resultToWrite[dayBeforeYesterday.toDateString()]);
        resultToWrite[dayBeforeYesterday.toDateString()]["tempTotalActiveSubscribers"] = totalActiveSubscribers; 

        for (res in resultToWrite) {
            let liveOnlyRevenue = (resultToWrite[res]["revenue-liveonly"])?resultToWrite[res]["revenue-liveonly"]:0;
            let liveWeeklyRevenue = (resultToWrite[res]["revenue-liveweekly"])?resultToWrite[res]["revenue-liveweekly"]:0;
            let comedyOnlyRevenue = (resultToWrite[res]["revenue-comedyonly"])?resultToWrite[res]["revenue-comedyonly"]:0 ;
            let comedyWeeklyRevenue = (resultToWrite[res]["revenue-comedyweekly"])?resultToWrite[res]["revenue-comedyweekly"]:0 ;
            
            let totalRevenue = liveOnlyRevenue + liveWeeklyRevenue + comedyOnlyRevenue + comedyWeeklyRevenue;
            
            let temp = {date: res, newUser: resultToWrite[res].newUser , newSubscriber: resultToWrite[res].newSubscriber,
                liveOnlyCount: resultToWrite[res]["users-billed-liveonly"],
                liveOnlyRevenue: liveOnlyRevenue,
                
                liveWeeklyCount: resultToWrite[res]["users-billed-liveweekly"],
                liveWeeklyRevenue: liveWeeklyRevenue,
                
                comedyOnlyCount: resultToWrite[res]["users-billed-comedyonly"],
                comedyOnlyRevenue: comedyOnlyRevenue,
                
                comedyWeeklyCount: resultToWrite[res]["users-billed-comedyweekly"],
                comedyWeeklyRevenue: comedyWeeklyRevenue,
                
                users_billed: resultToWrite[res].users_billed, trials: resultToWrite[res].trials,tempTotalActiveSubscribers: (resultToWrite[res]["tempTotalActiveSubscribers"])?resultToWrite[res]["tempTotalActiveSubscribers"]:"",
                totalUsers : resultToWrite[res].totalUsers, totalSubscribers: resultToWrite[res].totalSubscribers, 
                totalActiveSubscribers : (resultToWrite[res].totalSubscribers - resultToWrite[res].users_expired_till_today < 0)? 0 : resultToWrite[res].totalSubscribers - resultToWrite[res].users_expired_till_today,
                totalRevenue:  totalRevenue       
            }
            resultToWriteToCsv.push(temp);
        } 

        console.log("=> dailyReport 13");

    }catch(err){
        console.log("=> catch ", err);
    }

    try {  
        csvWriter.writeRecords(resultToWriteToCsv).then(async (data) => {
            var info = await transporter.sendMail({
                from: 'paywall@dmdmax.com.pk', // sender address
                //to:  ['farhan.ali@dmdmax.com'],
                to:  ["yasir.rafique@dmdmax.com","paywall@dmdmax.com.pk","mikaeel@dmdmax.com","zara.naqi@telenor.com.pk", "fahad.shabbir@ideationtec.com","ceo@ideationtec.com","asad@ideationtec.com","usama.abbasi@ideationtec.com","wasif@dmdmax.com"], // list of receivers
                subject: `Paywall Report`, // Subject ne
                text: `PFA some basic stats for Paywall - ${(new Date()).toDateString()}`, // plain text bodyday
                attachments:[
                    {
                        filename: paywallRevFileName,
                        path: paywallRevFilePath
                    }
                ]
            });
            console.log("=> dailyReport 14",info);
            fs.unlink(paywallRevFilePath,function(err,data) {
                if (err) {
                    console.log("=> [dailyReport]File not deleted");
                }
                console.log("=> [dailyReport]data");
            });
            console.log("=> [dailyReport]info",info);
        }).catch(er => {
            console.log("=> [dailyReport]err",er)
        });
        console.log("=> [dailyReport]resultToWrite",resultToWriteToCsv)
    } catch(err) {
        console.log("=> [dailyReport]",err);
    }
}

callBacksReport =async() => {
    try { 
        let startDate = new Date("2020-06-19T00:00:00.000Z");
        let report =  await Subscription.aggregate([ 
            { 
                $match: {
                        $or:[{source: "HE"},{source: "affiliate_web"}],
                        added_dtm: { $gte: startDate }
                    } 
            },
            {
                $lookup:  
                    {        
                        from: "billinghistories",        
                        localField: "_id",        
                        foreignField: "subscription_id",        
                        as: "histories" 
                    } 
            },
            { 
                $project: { 
                    tid: "$affiliate_unique_transaction_id",
                    mid: "$affiliate_mid",
                    added_dtm: "$added_dtm",
                    active: "$active",
                    callbackhistory: {
                            $filter: {
                                input: "$histories",
                                as: "histor",
                                cond: {$eq: ["$$histor.billing_status", "Affiliate callback sent" ] }
                            }
                    }
                }
            }, 
            { 
                $project: { 
                tid: "$tid",
                mid: "$mid",
                isValidUser: {$cond: {if: {$eq:["$active",true]}, then: true, else: false } },
                added_dtm: "$added_dtm",
                callbackhistorySize: {"$size": "$callbackhistory" },
                callbackObj: {$arrayElemAt: ["$callbackhistory",0]},
                added_dm: { '$dateToString' : { date: "$added_dtm",'format':'%Y-%m-%d-%H:%M:%S','timezone' : "Asia/Karachi" } },
                }
            },
            { 
                $project: { 
                tid: "$tid",
                mid: "$mid",
                isValidUser: "$isValidUser",
                callbackhistorySize: "$callbackhistorySize",
                added_dm: { '$dateToString' : { date: "$added_dtm",'format':'%Y-%m-%d-%H:%M:%S','timezone' : "Asia/Karachi" } },
                billing_dm: { '$dateToString' : { date: "$callbackObj.billing_dtm",'format':'%Y-%m-%d-%H:%M:%S','timezone' : "Asia/Karachi" } }
                }
            }, 
            { 
                $project: { 
                tid: "$tid",
                mid: "$mid",
                isValidUser: "$isValidUser",
                added_dtm:  {$cond: {if: "$isValidUser", then: "$added_dm" , else: "" } },
                isCallbAckSent: {$cond: { if: { $and: [{$gte: ["$callbackhistorySize",1]},{$eq: [ "$isValidUser",true ]} ] } ,then:"yes",else:"no" }} ,
                callBackSentTime: {$cond: {if: "$isValidUser", then: "$billing_dm" , else: "" } }  
                }
            }
        ]);

        let write = await csvReportWriter.writeRecords(report);
        var info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk', // sender address
            // to:  ["paywall@dmdmax.com.pk"],
            to:  ["paywall@dmdmax.com.pk","nauman@dmdmax.com","mikaeel@dmdmax.com"], // list of receivers
            subject: `Callbacks Report`, // Subject line
            text: `Callbacks sent with their TIDs and timestamps -  ${(new Date()).toDateString()}`, // plain text bodyday
            attachments:[
                {
                    filename: paywallCallbackReport,
                    path: paywallCallbackFilePath
                }
            ]
        });
        console.log("***> Report",info);
        fs.unlink(paywallCallbackFilePath,function(err,data) {
            if (err) {
                console.log("***> File not deleted");
            }
            console.log("***> data",data);
        });
    } catch(err) {
        console.log("***> Error", err);
    }
    
}

const errorCountReportBySource = createCsvWriter({
    path: paywallErrorCountBySourceFilePath,
    header: [
        {id: 'source', title: 'Source'},
        {id: 'errorMessage', title: 'Error Message'},
        {id: 'errorCode', title: 'Error Code'},
        {id: "count",title: "Error Count" }
    ]
});

const errorCountReportWriter = createCsvWriter({
    path: paywallErrorCountFilePath,
    header: [
        {id: 'errorMessage', title: 'Error Message'},
        {id: 'errorCode', title: 'Error Code'},
        {id: "count",title: "Error Count" }
    ]
});

const dailyUnsubReportWriter = createCsvWriter({
    path: paywallUnsubFilePath,
    header: [
        {id: 'date', title: 'Date'},
        {id: "count",title: "Unsubscribe Count" },
        {id: "source",title: "Source" }
    ]
});

const dailyChannelWiseUnsubWriter = createCsvWriter({
    path: paywallChannelWiseUnsubReportFilePath,
    header: [
        {id: 'date', title: 'Date'},
        {id: 'app', title: 'App'},
        {id: 'web', title: 'Web'},
        {id: 'sms', title: 'Sms'},
        {id: 'cc', title: 'Customer Care'},
        {id: 'cp', title: 'Customer Portal'},
        {id: 'expired', title: 'Expired By System'},
        {id: "total",title: "Total" }
    ]
});

const dailyChannelWiseTrialWriter = createCsvWriter({
    path: paywallChannelWiseTrialFilePath,
    header: [
        {id: 'date', title: 'Date'},
        {id: 'app', title: 'App'},
        {id: 'web', title: 'Web'},
        {id: 'HE', title: 'Affiliate'},
        {id: "total",title: "Total" }
    ]
});

errorCountReport = async() => {
    try {
        let errorBySourceReport = await billinghistoryRepo.errorCountReportBySource();
        console.log("=> done 1");
        let errorReport = await billinghistoryRepo.errorCountReport();
        console.log("=> done 2");
        
        await errorCountReportWriter.writeRecords(errorReport);
        await errorCountReportBySource.writeRecords(errorBySourceReport);
        var info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk', // sender address
            to:  ["farhan.ali@dmdmax.com"],
            //to:  ["paywall@dmdmax.com.pk","mikaeel@dmdmax.com"], // list of receivers
            subject: `Daily Error Reports`, // Subject line
            text: `This report (generated at ${(new Date()).toDateString()}) contains all error count stats from 23rd February 2020 onwards.`, // plain text bodyday
            attachments:[
                {
                    filename: paywallErrorCountReport,
                    path: paywallErrorCountFilePath
                },
                {
                    filename: paywallErrorCountReportBySource,
                    path: paywallErrorCountBySourceFilePath
                }
            ]
        });
        console.log("=> [errorCountReport][emailSent]",info);
        fs.unlink(paywallErrorCountFilePath,function(err,data) {
            if (err) {
                console.log("File not deleted[errorCountReport]");
            }
            console.log("File deleted [errorCountReport]");
        });
        fs.unlink(paywallErrorCountBySourceFilePath,function(err,data) {
            if (err) {
                console.log("File not deleted[errorCountReportBySource]");
            }
            console.log("File deleted [errorCountReportBySource]");
        });
    } catch (error) {
        console.error("=>", error);
    }
}

dailyUnsubReport = async(from,to) => {
    try {
        let dailyUnsubReport = await billinghistoryRepo.dailyUnsubReport();
        await dailyUnsubReportWriter.writeRecords(dailyUnsubReport);
        var info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk', // sender address
            // to:  ["hamza@dmdmax.com"],
            to:  ["paywall@dmdmax.com.pk"], // list of receivers
            subject: `Daily Unsubscribed Users Report`, // Subject line
            text: `This report (generated at ${(new Date()).toDateString()}) contains count of unsubscribed users.`, // plain text bodyday
            attachments:[
                {
                    filename: paywallUnsubReport,
                    path: paywallUnsubFilePath
                }
            ]
        });
        console.log("[dailyUnsubReport][emailSent]",info);
        fs.unlink(paywallUnsubFilePath,function(err,data) {
            if (err) {
                console.log("File not deleted[dailyUnsubReport]");
            }
            console.log("File deleted [dailyUnsubReport]");
        });
    } catch (error) {
        console.error(error);
    }
}

dailyNetAddition = async(from, to) => {
    try {
        let csvData = [];

        console.log("=> from", from, "to", to);
        let dailySubscriptions = await subscriptionRepo.getAllSubscriptionsByDate(from, to);
        let dailyUnSubscriptions = await billinghistoryRepo.unsubReport(from, to);

        for(let i = 0; i < dailySubscriptions.length; i++){
            let data = {};
            data.date = dailySubscriptions[i].date;
            if(new Date(dailySubscriptions[i].date).getTime() === new Date(dailyUnSubscriptions[i].date).getTime()){
                data.subs = dailySubscriptions[i].count;
                data.unsubs = dailyUnSubscriptions[i].count;
                data.net = (dailySubscriptions[i].count - dailyUnSubscriptions[i].count);
                csvData.push(data);
            }
        }

        await dailyNetAdditionWriter.writeRecords(csvData);
        console.log("=> Daily Addition Report");
        from = new Date(from);
        let info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk',
            to:  ["farhan.ali@dmdmax.com"],
            // to:  ["paywall@dmdmax.com.pk", "zara.naqi@telenor.com.pk", "mikaeel@dmdmax.com", "khurram.javaid@telenor.com.pk", "junaid.basir@telenor.com.pk"], // list of receivers
            subject: `Daily Net Additions - ${monthNames[from.getMonth()]}`,
            text: `This report contains daily net additions for the month of ${monthNames[from.getMonth()]}.`,
            attachments:[
                {
                    filename: dailyNetAdditionCsv,
                    path: dailyNetAdditionFilePath
                }
            ]
        });
        console.log("=> [dailyNetAdditionCsv][emailSent]",info);
        fs.unlink(dailyNetAdditionFilePath,function(err,data) {
            if (err) {
                console.log("=> File not deleted[dailyNetAdditionCsv]");
            }
            console.log("=> File deleted [dailyNetAdditionCsv]");
        });
    } catch (error) {
        console.error("=> error ", error);
    }
}

avgTransactionPerCustomer = async(from, to) => {
    try {
        console.log("=> AvgTransactionPerCustomer from", from, "to", to);
        let totalTransactions = await billinghistoryRepo.numberOfTransactions(from, to);
        totalTransactions = totalTransactions[0].count;

        let totalUniqueUsers = await billinghistoryRepo.totalUniqueTransactingUsers(from, to);
        totalUniqueUsers = totalUniqueUsers[0].count;

        let avgTransactions = totalTransactions / totalUniqueUsers;

        console.log("=> Avg. Transactions Per Customer Report");
        from = new Date(from);
        let info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk',
            to:  ["farhan.ali@dmdmax.com"],
            // to:  ["paywall@dmdmax.com.pk", "zara.naqi@telenor.com.pk", "mikaeel@dmdmax.com", "khurram.javaid@telenor.com.pk", "junaid.basir@telenor.com.pk"], // list of receivers
            subject: `Avg Transactions/Customer - ${monthNames[from.getMonth()]}`,
            text: `Avg Transactions/Customer for the month of ${monthNames[from.getMonth()]} are ${avgTransactions}`,
        });
        console.log("=> [avgTransactionPerCustomer][emailSent]",info);
    } catch (error) {
        console.error("=> avgTransactionPerCustomer- error ", error);
    }
}

weeklyRevenue = async(weekFromArray, weekToArray, emailList) => {
    try {
        let emailBody = "";

        for(let i = 0; i < weekFromArray.length; i++){
            let weekFrom = weekFromArray[i];
            let weekTo = weekToArray[i];

            console.log("=> weeklyRevenue from", weekFrom, "to", weekTo);
            let revenue = await billinghistoryRepo.getRevenueInDateRange(weekFrom, weekTo);
            emailBody = emailBody.concat(`${weekFrom} - ${weekTo}:   ${revenue[0].total}\n`);
        }

        let info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk',
            to:  emailList,
            subject: `Weekly Revenue Report - ${monthNames[weekFromArray[0].getMonth()]}`,
            text: emailBody,
        });
        console.log("=> [weeklyRevenue][emailSent]",info);
        
    } catch (error) {
        console.error("=> weeklyRevenue- error ", error);
    }
}

weeklyTransactingCustomers = async(weekFromArray, weekToArray, emailList) => {

    try {
        let emailBody = "";

        for(let i = 0; i < weekFromArray.length; i++){
            let weekFrom = weekFromArray[i];
            let weekTo = weekToArray[i];

            console.log("=> weeklyTransactingCustomers from", weekFrom, "to", weekTo);
            let totalUniqueUsers = await billinghistoryRepo.totalUniqueTransactingUsers(weekFrom, weekTo);
            emailBody = emailBody.concat(`${weekFrom} - ${weekTo}:   ${totalUniqueUsers[0].count}\n`);
        }

        let info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk',
            to:  emailList,
            subject: `Weekly Transacting Customers - ${monthNames[weekFromArray[0].getMonth()]}`,
            text: emailBody,
        });
        console.log("=> [weeklyTransactingCustomers][emailSent]",info);
        
    } catch (error) {
        console.error("=> weeklyTransactingCustomers- error ", error);
    }
}

dailyReturningUsers = async(from, to) => {
    try {
        console.log("=> DailyReturningUsers from", from, "to", to);
        let dailyReturningUsers = await billinghistoryRepo.dailyReturningUsers(from, to);
        console.log("=> DailyReturningUsers", dailyReturningUsers);
        let dailyReturningUsersCount = dailyReturningUsers[0].totalcount;
        console.log(`=> Daily Returning Users for ${to} are ${dailyReturningUsersCount}`);
        
        let info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk',
            //to:  ["farhan.ali@dmdmax.com"],
            to:  ["paywall@dmdmax.com.pk","mikaeel@dmdmax.com"],
            subject: `Daily Returning Users`,
            text: `Daily returning users for the date ${to} are ${dailyReturningUsersCount}`,
        });
        console.log("=> [dailyReturningUsers][emailSent]",info);
    } catch (error) {
        console.error("=> dailyReturningUsers- error ", error);
    }
}

dailyChannelWiseUnsub = async() => {
    try {
        console.log("=> [dailyChannelWiseUnsub]");
        let records = [];
        let dailyChannelWiseUnsub = await billinghistoryRepo.dailyChannelWiseUnsub(); 
        console.log("=> done 1"); 
        let dailyExpiredBySystem = await billinghistoryRepo.dailyExpiredBySystem();
        console.log("=> done 2");

        dailyChannelWiseUnsub.forEach(element => {
            let date = element.date;
            let source = element.source;
            let count = element.count;
            
            let present = isDatePresent(records, date);
            if(present){
                if(source === "app" || source == "na"){
                    present.app = (present.app + count);
                    present.total = (present.total + count);
                }else if(source === "web"){
                    present.web = (present.web + count);
                    present.total = (present.total + count);
                }else if(source === "sms"){
                    present.sms = (present.sms + count);
                    present.total = (present.total + count);
                }else if(source === "CC"){
                    present.cc = (present.cc + count);
                    present.total = (present.total + count);
                }else if(source === "CP"){
                    present.cp = (present.cp + count);
                    present.total = (present.total + count);
                }
            }else{
                let expiredBySystem = isDatePresent(dailyExpiredBySystem, date);
                let app = (source === "app" || source == "na") ? count : 0;
                let web = source === "web" ? count : 0;
                let sms = source === "sms" ? count : 0;
                let cc = source === "CC" ? count : 0;
                let cp = source === "CP" ? count : 0;
                let expired = expiredBySystem !== undefined ? expiredBySystem.count : 0;

                let total = (app + web + sms + cc + cp + expired);

                let object = {date: date, app: app, web: web, sms: sms, cc: cc, cp: cp, expired: expired, total: total};
                records.push(object);
            }
            
        });

        await dailyChannelWiseUnsubWriter.writeRecords(records);
        console.log("=> done 3");
        var info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk', // sender address
            // to:  ["farhan.ali@dmdmax.com"],
            to:  ["paywall@dmdmax.com.pk","nauman@dmdmax.com"], // list of receivers
            subject: `Daily Source Wise Unsubscribed Users Report`, // Subject line
            text: `This report (generated at ${(new Date()).toDateString()}) contains count of unsubscribed users with respect to source.\n\nNote: Expired By System column indicates those users expired by the system because their grace time is over and they still have no balance.`, // plain text bodyday
            attachments:[
                {
                    filename: paywallChannelWiseUnsubReport,
                    path: paywallChannelWiseUnsubReportFilePath
                }
            ]
        });
        console.log("=> [dailyChannelWiseUnsub][emailSent]",info);
        fs.unlink(paywallChannelWiseUnsubReportFilePath,function(err,data) {
            if (err) {
                console.log("=> File not deleted[dailyChannelWiseUnsub]");
            }
            console.log("=> File deleted [dailyChannelWiseUnsub]");
        });
    } catch (error) {
        console.error("=>", error);
    }
}

dailyChannelWiseTrialActivated = async() => {
    try {
        console.log("[dailyChannelWiseTrialActivated]");
        let records = [];
        let dailyChannelWiseTrial = await billinghistoryRepo.dailyChannelWiseTrialActivated(); 

        dailyChannelWiseTrial.forEach(element => {
            let date = element.date;
            let source = element.source;
            let count = element.count;
            
            let present = isDatePresent(records, date);
            if(present){
                if(source === "app"){
                    present.app = (present.app + count);
                    present.total = (present.total + count);
                }else if(source === "web"){
                    present.web = (present.web + count);
                    present.total = (present.total + count);
                }else if(source === "HE"){
                    present.HE = (present.HE + count);
                    present.total = (present.total + count);
                }
            }else{
                let app = source === "app" ? count : 0;
                let web = source === "web" ? count : 0;
                let HE = source === "HE" ? count : 0;
                let total = (app + web + HE);

                let object = {date: date, app: app, web: web, HE: HE, total: total};
                records.push(object);
            }
            
        });

        await dailyChannelWiseTrialWriter.writeRecords(records);

        var info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk', // sender address
            // to:  ["paywall@dmdmax.com.pk"],
            to:  ["paywall@dmdmax.com.pk","mikaeel@dmdmax.com"], // list of receivers
            subject: `Source Wise Trial Activated Report`, // Subject line
            text: `This report (generated at ${(new Date()).toDateString()}) contains count of trials activated with respect to source.`, // plain text bodyday
            attachments:[
                {
                    filename: paywallChannelWiseTrial,
                    path: paywallChannelWiseTrialFilePath
                }
            ]
        });
        console.log("[dailyChannelWiseTrialActivated][emailSent]",info);
        fs.unlink(paywallChannelWiseTrialFilePath,function(err,data) {
            if (err) {
                console.log("File not deleted[paywallChannelWiseTrial]");
            }
            console.log("File deleted [dailyChannelWiseTrialActivated]");
        });
    } catch (error) {
        console.error(error);
    }
}

function isDatePresent(array, dateToFind) {
    const result = array.find(o => new Date(o.date).getTime() === new Date(dateToFind).getTime());
    return result;
}

function isMultipleDatePresent(array, date1ToFind) {
    let newDate1ToFind = new Date(date1ToFind);

    const result = array.find(o =>
         new Date(o.trial_date).getTime() === newDate1ToFind.getTime()
         );
    return result;
}

dailyTrialToBilledUsers = async() => {
    try {
        console.log("=> dailyTrialToBilledUsers");

        let yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
    
        let dayBeforeYesterday = new Date();
        dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
        dayBeforeYesterday.setHours(0, 0, 0, 0);
        console.log("=> Query from - ", dayBeforeYesterday, ' - to ', yesterday);

        let trialToBilled = await subscriptionRepo.dailyTrialToBilledUsers(dayBeforeYesterday, yesterday);
        console.log("=> ", JSON.stringify(trialToBilled));

        let totalSum = 0;
        for (let i = 0; i < trialToBilled.length; i++){
            totalSum += trialToBilled[i].count;
        }
        console.log("=> sending email ", totalSum);

        var info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk',
            to:  ["paywall@dmdmax.com.pk", "nauman@dmdmax.com", "mikaeel@dmdmax.com"],
            subject: 'Trial To Billed Users',
            text: `This report (generated at ${(new Date()).toDateString()}) contains count of users who are directly billed after trial from ${dayBeforeYesterday} to ${yesterday}.\n\nTrial: ${dayBeforeYesterday}\nBilled: ${yesterday}\nCount: ${totalSum}`
        });

        console.log("=> [trialToBilledUsers][emailSent]", info);
    } catch (error) {
        console.error(error);
    }
}

dailyFullAndPartialChargedUsers = async() => {
    try {
        console.log("=> dailyFullAndPartialChargedUsers");
        let dailyReport = await billinghistoryRepo.getDailyFullyChargedAndPartialChargedUsers();
        console.log("=> done 1");
        let array = [];

        dailyReport.forEach(element => {
            let obj = isDatePresent(array, element.date);
            if(!obj){
                obj = {date: element.date};
                array.push(obj);
            }

            if(element.micro_charge_state === true){
                obj.partially_charged_users = element.total;
            }else{
                obj.fully_charged_users = element.total;
            }
            obj.total = obj.total ? (obj.total + element.total) : element.total;
        });

        await csvFullAndPartialCharged.writeRecords(array);
        var info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk',
            // to:  ["farhan.ali@dmdmax.com"],
            to:  ["paywall@dmdmax.com.pk",  "mikaeel@dmdmax.com", "nauman@dmdmax.com"], // list of receivers
            subject: 'Full & Partial Charged Users',
            text: `This report (generated at ${(new Date()).toDateString()}) contains count of full & partial charged users.`, // plain text bodyday
            attachments:[
                {
                    filename: paywallFullAndPartialChargedReport,
                    path: paywallFullAndPartialChargedReportFilePath
                }
            ]
        });
        console.log("=> [fullAndPartialChargedUsers][emailSent]", info);
        fs.unlink(paywallFullAndPartialChargedReportFilePath,function(err,data) {
            if (err) {
                console.log("=> File not deleted");
            }
            console.log("=> ", data);
        });
    } catch (error) {
        console.error("=>", error);
    }
}

dailyPageViews = async() => {
    console.log("***=> sending email")
    pageViews.connect().then(async(db) => {
        pageViews.getPageViews(db).then(async(pvs) => {
            console.log("***=>", pvs);
            await csvAffiliatePvs.writeRecords(pvs);
                var info = await transporter.sendMail({
                from: 'paywall@dmdmax.com.pk',
                // to:  ["hamza@dmdmax.com"],
                to:  ["paywall@dmdmax.com.pk","nauman@dmdmax.com", "mikaeel@dmdmax.com"], // list of receivers
                subject: 'Affiliate Page Views',
                text: `This report (generated at ${(new Date()).toDateString()}) contains affiliate page views`, // plain text bodyday
                attachments:[
                    {
                        filename: affiliatePvs,
                        path: affiliatePvsFilePath
                    }
                ]
            });
            console.log("***=> [csvAffiliatePvs][emailSent]", info);
            fs.unlink(affiliatePvsFilePath,function(err,data) {
                if (err) {
                    console.log("***=>File not deleted");
                }
                console.log("***=>", data);
            });
        }).catch(err => {
            console.log("***=>", err);
        });
        }).then(err => {
            console.log(err);
        });
}

getTotalUserBaseTillDate = async(from, to) => {
    let result = await usersRepo.getTotalUserBaseTillDate(from, to);
    await csvTotalBase.writeRecords(result);

    var info = await transporter.sendMail({
        from: 'paywall@dmdmax.com.pk', // sender address
        to:  ["paywall@dmdmax.com.pk", "mikaeel@dmdmax.com"],
        //to:  ["paywall@dmdmax.com.pk","zara.naqi@telenor.com.pk","mikaeel@dmdmax.com"], // list of receivers
        subject: `Paywall Total Base`, // Subject line
        text: `This report contains total user base from ${new Date(from)} to ${new Date(to)}.`,
        attachments:[
            {
                filename: paywallTotalBase,
                path: paywallTotalBaseFilePath
            }
        ]
    });
    console.log("[totalBase][emailSent]",info);
    fs.unlink(paywallTotalBaseFilePath,function(err,data) {
        if (err) {
            console.log("File not deleted[totalBase]");
        }
        console.log("File deleted [totalBase]");
    });
}

getExpiredBase = async() => {
    console.log('=> getExpiredBase');
    let result = await subscriptionRepo.getExpiredFromSystem();
    console.log('=> returned result counts ', result);
    let finalResult = [];
    for(let i = 0; i < result.length; i++){
        console.log('=>', result[i].userDetails.msisdn);
        finalResult.push({msisdn: result[i].userDetails.msisdn});
    }

    console.log('=> preparing csv - ', finalResult);

    await csvExpiredBase.writeRecords(finalResult);
    
    console.log('=> sending email');
    var info = await transporter.sendMail({
        from: 'paywall@dmdmax.com.pk', // sender address
        to:  ["farhan.ali@dmdmax.com"],
        subject: `5. Expired Base Msisdns`, // Subject line
        text: `This report contains total expired base i.e 7th Feb to date.`,
        attachments:[
            {
                filename: paywallExpiredBase,
                path: paywallExpiredBaseFilePath
            }
        ]
    });
    console.log("=> [expiredBase][emailSent]",info);
    fs.unlink(paywallExpiredBaseFilePath,function(err,data) {
        if (err) {
            console.log("=> File not deleted[expiredBase]");
        }
        console.log("=> File deleted [expiredBase]");
    });
}

getInactiveBase = async(from, to) => {
    let result = await usersRepo.getActiveUsers(from, to);

    let totalLength = result.length;
    let count = 0;
    console.log("*** Length: "+totalLength);

    let finalResult = [];
    let fiveDaysBack = new Date();
    fiveDaysBack.setDate(fiveDaysBack.getDate() - 7);

    let promise = new Promise((resolve, reject) => {
        result.forEach((user) => {
            getViewLogs(user._id).then((viewLog) => {
                console.log("*** Got result for ", user.msisdn);
    
                let latestLogTime = new Date(viewLog.added_dtm);
                if(fiveDaysBack.getTime() > latestLogTime.getTime()){
                    // Means 5 days passed user last visited app/web
                    finalResult.push({"msisdn": user.msisdn});
                }
            }).catch((err) => {
                //console.log("error ", err);
            }).finally(() => {
                console.log("*** Finally");
                count+=1;

                if (count === totalLength){
                    console.log("*** Resolved"); 
                    resolve();
                }
            });
        });
    });
    
    promise.then(async() => {
        console.log("*** ALL DONE");
        await csvInActiveBase.writeRecords(finalResult);

        var info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk', // sender address
            to:  ["paywall@dmdmax.com.pk", "mikaeel@dmdmax.com"],
            //to:  ["paywall@dmdmax.com.pk","zara.naqi@telenor.com.pk","mikaeel@dmdmax.com"], // list of receivers
            subject: `Paywall InActive Base`, // Subject line
            text: `This report contains inactive base from ${new Date(from)} to ${new Date(to)}.\nInActive: Have not opened App/Web in last 7 days but are subscribed users`,
            attachments:[
                {
                    filename: paywallInActiveBase,
                    path: paywallInActiveBaseFilePath
                }
            ]
        });
        console.log("*** [paywallInActiveBase][emailSent]",info);
        fs.unlink(paywallInActiveBaseFilePath,function(err,data) {
            if (err) {
                console.log("*** File not deleted[paywallInActiveBase]");
            }
            console.log("*** File deleted [paywallInActiveBase]");
        });
    })
}

getUsersNotSubscribedAfterSubscribe = async() => {
    try{
        let result = await billinghistoryRepo.getUsersNotSubscribedAfterSubscribe();
        console.log("=> ALL DONE");
        await ActiveBaseWriter.writeRecords(result);

        var info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk', // sender address
            to:  ["paywall@dmdmax.com.pk"],
            subject: `Users who subscribed in Jul but did subscribe in Aug`,
            text: `This report contains users who subscribed in Jul but did subscribe in Aug`,
            attachments:[
                {
                    filename: ActiveBase,
                    path: ActiveBaseFilePath
                }
            ]
        });

        console.log("=> [ActiveBaseFilePath][emailSent]",info);
        fs.unlink(ActiveBaseFilePath,function(err,data) {
            if (err) {
                console.log("=> File not deleted[ActiveBaseFilePath]");
            }
            console.log("=> File deleted [ActiveBaseFilePath]");
        });
    }catch(e){
        console.log("=>", e);
    }
}

getActiveBase = async(from, to) => {
    let result = await usersRepo.getActiveUsers(from, to);
    console.log("*** ALL DONE");
    await ActiveBaseWriter.writeRecords(result);

    var info = await transporter.sendMail({
        from: 'paywall@dmdmax.com.pk', // sender address
        to:  ["paywall@dmdmax.com.pk"],
        subject: `Paywall Active Base`, // Subject line
        text: `This report contains active base from ${new Date(from)} to ${new Date(to)}.`,
        attachments:[
            {
                filename: ActiveBase,
                path: ActiveBaseFilePath
            }
        ]
    });
    console.log("*** [ActiveBaseFilePath][emailSent]",info);
    fs.unlink(ActiveBaseFilePath,function(err,data) {
        if (err) {
            console.log("*** File not deleted[ActiveBaseFilePath]");
        }
        console.log("*** File deleted [ActiveBaseFilePath]");
    });
}

getInactiveBaseHavingViewLogsLessThan3 = async(from, to) => {
    let result = await usersRepo.getActiveUsers(from, to);
    let finalResult = [];
    let totalLength = result.length;
    let count = 0;
    console.log("*** Length: "+totalLength);

    let promise = new Promise((resolve, reject) => {
        result.forEach((user) => {
            getNumberOfViewLogs(user._id).then((count) => {
                console.log("*** Got result for ", user.msisdn, ' - ', count);
    
                if(count < 3){
                    // Means user visited app/web for once/twice
                    finalResult.push({"msisdn": user.msisdn});
                }
            }).catch((err) => {
                //console.log("error ", err);
            }).finally(() => {
                count+=1;

                if (count === totalLength){
                    console.log("*** Resolved"); 
                    resolve();
                }
            });
        });
    });
    
    promise.then(async() => {
        console.log("*** ALL DONE");
        await csvInActiveBase.writeRecords(finalResult);

        var info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk', // sender address
            to:  ["paywall@dmdmax.com.pk", "mikaeel@dmdmax.com"],
            //to:  ["paywall@dmdmax.com.pk","zara.naqi@telenor.com.pk","mikaeel@dmdmax.com"], // list of receivers
            subject: `Paywall InActive Base`, // Subject line
            text: `This report  contains inactive base from ${new Date(from)} to ${new Date(to)}.\nInActive: Users who only opened app once/twice since subscribing.`,
            attachments:[
                {
                    filename: paywallInActiveBase,
                    path: paywallInActiveBaseFilePath
                }
            ]
        });
        console.log("*** [paywallInActiveBase][emailSent]",info);
        fs.unlink(paywallInActiveBaseFilePath,function(err,data) {
            if (err) {
                console.log("*** File not deleted[paywallInActiveBase]");
            }
            console.log("*** File deleted [paywallInActiveBase]");
        });
    })
}

generateUsersReportWithTrialAndBillingHistory = async(from, to) => {
    console.log("=> generateUsersReportWithTrialAndBillingHistory - from ", from, " to ", to);
    let finalResult = [];
    
    let aff_mids = [{affiliate_mid: "goonj"},{affiliate_mid: "1569"},{affiliate_mid: "gdn"},
        {affiliate_mid: "gdn2"},{affiliate_mid: "aff3"},{affiliate_mid: "aff3a"}
    ]

    let affMidsSubscriptions = await subscriptionRepo.getSubscriptionsForAffiliateMids(aff_mids, from, to);
    
    for(let i = 0; i < affMidsSubscriptions.length; i++){
        console.log("=> fetching data for affiliate mid ",affMidsSubscriptions[i]._id);
        let subscriber_ids = affMidsSubscriptions[i].subscriber_ids;
        let result = await billinghistoryRepo.getBillingDataForSpecificSubscriberIds(subscriber_ids);
        
        for(let j = 0; j < result.length; j++){
            console.log("=> user_id", result[j].user_id);
            
            let dataPresent = isDataPresent(finalResult, result[j].user_id);
            if(dataPresent){
                if(result[j].billing_status === "Success"){
                    dataPresent.success_transactions = dataPresent.success_transactions + 1;
                    dataPresent.amount = dataPresent.amount + result[j].price;
                }else if(result[j].billing_status === "trial"){
                    dataPresent.code = 0;
                }
            }else{
                let singleObject = {};
                singleObject.mid = affMidsSubscriptions[i]._id;
                singleObject.user_id = result[j].user_id;
                
                if(result[j].billing_status === "Success"){
                    singleObject.success_transactions = 1;
                    singleObject.amount = result[j].price;
                    singleObject.code = 1;
                }else if(result[j].billing_status === "trial"){
                    singleObject.success_transactions = 0;
                    singleObject.amount = 0;
                    singleObject.code = 0
                }
                finalResult.push(singleObject);
            }
        }
    }
    
    console.log("=>", JSON.stringify(finalResult));

    console.log("=> Sending email");
    await usersReportWithTrialAndBillingHistoryWriter.writeRecords(finalResult);
    let info = await transporter.sendMail({
        from: 'paywall@dmdmax.com.pk',
        to:  ["farhan.ali@dmdmax.com"],
        subject: `Users With Trial & Billing Details`, // Subject line
        text: `This report contains affiliate users with trial and billing details from ${new Date(from)} to ${new Date(to)}.\nNote: code 0 indicates trial and code 1 indicates subscribed directly`,
        attachments:[
            {
                filename: usersReportWithTrialAndBillingHistory,
                path: usersReportWithTrialAndBillingHistoryFilePath
            }
        ]
    });

    console.log("=> [usersReportWithTrialAndBillingHistory][emailSent]",info);
    fs.unlink(usersReportWithTrialAndBillingHistoryFilePath,function(err,data) {
        if (err) {
            console.log("=> File not deleted[usersReportWithTrialAndBillingHistory]");
        }
        console.log("=> File deleted [usersReportWithTrialAndBillingHistory]");
    });
}

// generateReportForAcquisitionSourceAndNoOfTimeUserBilled = async() => {
    
//     console.log("=> generateReportForAcquisitionSourceAndNoOfTimeUserBilled");
//     let finalResult = [];
//     let inputData = ["03430875776","03445468452","03445235824","03404811033","03457075606","03487811171","03414215391","03451005178","03149494502","03422269135","03481527024","03457571470","03476882993","03455757739","03474425537","03479336134","03438880900","03428273381","03460274032","03405458115","03482210863","03447610554","03454331969","03477344114","03487724754","03403199937","03135922773","03443384250","03480609290","03448861028","03023500251","03429724165","03466518773","03169551457","03480346761","03486883673","03404820727","03496055877","03484777970","03485271965","03466476538","03459610453","03417005605","03429840915","03454549335","03457384559","03496037421","03459038280","03444055091","03410093896","03443744800","03497602705","03448679535","03481082881","03488481958","03497983508","03417664061","03453830959","03407356551","03464112627","03418018606","03445297155","03451989245","03484224839","03485270943","03418692162","03457581077","03401227327","03419790981","03469410822","03454847498","03451053380","03462156419","03479232536","03458319209","03452914560","03460178356","03409561056","03475684664","03471693905","03474893328","03443732819","03448094797","03423840772","03128612001","03452199820","03440201264","03436725887","03070153693","03414996024","03432084218","03085278849","03464157962","03452114743","03454862376","03448213708","03468959334","03436531217","03454620292","03450065303","03467737876","03449488427","03421440974","03433011347","03438765919","03424354239","03429323235","03452701714","03477368027","03469525335","03445797007","03404420315","03482842372","03453594305","03416093789","03478223025","03239823060","03457528376","03465777177","03470479162","03444346499","03447419877","03457537960","03439333675","03481712843","03475847464","03494931172","03494939497","03444109767","03468823418","03457898312","03494769522","03487653753","03437816965","03405899940","03440328970","03490219461","03465774028","03214521894","03461888184","03431381272","03457296608","03423001035","03489848076","03453464601","03488722559","03479196621","03422968995","03417535639","03455810424","03443016285","03442139178","03405137637","03445897525","03469739775","03453788358","03497307591","03434178534","03460634612","03422733454","03340013838","03475916160","03422325261","03466292882","03452373690","03416644148","03486053332","03457981802","03484020345","03426566118","03416163819","03422294391","03442848600","03407558138","03439259040","03423462289","03481671495","03472951438","03425081817","03444790106","03448985065"];
    
//     try{
//         for(let i = 0; i < inputData.length; i++){
//             let singleRecord = await usersRepo.getData(inputData[i]);
//             if(singleRecord.length > 0){
//                 singleRecord = singleRecord[0];
//                 let singObject = {
//                     msisdn: singleRecord.msisdn,
//                     acquisition_date: singleRecord.acquisition_date,
//                     number_of_success_charging: singleRecord.total_successful_chargings
//                 };

//                 if(singleRecord.acquisition_mid){
//                     singObject.acquisition_source = singleRecord.acquisition_mid;
//                 }else{
//                     if(singleRecord.acquisition_source === 'affiliate_web'){
//                         singObject.acquisition_source = 'web';
//                     }else{
//                         singObject.acquisition_source = singleRecord.acquisition_source;
//                     }
                    
//                 }
        
//                 let expiryHistory = {};
//                 if(singleRecord.subscription_status === 'expired'){
//                     expiryHistory = await billinghistoryRepo.getExpiryHistory(singleRecord.user_id);
//                     if(expiryHistory.length >= 2){
//                         expiryHistory.sort(function(a,b){
//                             return new Date(b.billing_dtm) - new Date(a.billing_dtm);
//                         });
//                     }
        
//                     singObject.unsub_date = expiryHistory[0].billing_dtm;
//                 }
    
//                 finalResult.push(singObject);
//                 console.log("=> Data done for item ", i);
//             }
//         }
    
//         console.log("=> Sending email");
//         await randomReportWriter.writeRecords(finalResult);
//         let info = await transporter.sendMail({
//             from: 'paywall@dmdmax.com.pk',
//             to:  ["farhan.ali@dmdmax.com"],
//             subject: `Complaint Data`, // Subject line
//             text: `This report contains the details of msisdns being sent us over email from Zara`,
//             attachments:[
//                 {
//                     filename: randomReport,
//                     path: randomReportFilePath
//                 }
//             ]
//         });
    
//         console.log("=> [randomReport][emailSent]",info);
//         fs.unlink(randomReportFilePath,function(err,data) {
//             if (err) {
//                 console.log("=> File not deleted[randomReport]");
//             }
//             console.log("=> File deleted [randomReport]");
//         });
//     }catch(e){
//         console.log("=> error - ",JSON.stringify(e));
//     }
// }

getOnlySubscriberIds = async(source, fromDate, toDate) => {
    try{
        let records = await subscriptionRepo.getOnlySubscriberIds(source, fromDate, toDate);
        console.log("=> dateWiseChargingDetails - done1");
        let ids = await getArray(records);
        console.log("=> dateWiseChargingDetails - done2");
        let details = await billinghistoryRepo.getChargingDetails(ids, fromDate, toDate);

        console.log("=> Sending email");
        await dateWiseChargingDetailsWriter.writeRecords(details);

        let fromDuplicate = new Date(fromDate);

        let info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk',
            to:  ["farhan.ali@dmdmax.com"],
            subject: `Day-wise Charging Details For ${source} - ${monthNames[fromDuplicate.getMonth()]}`, // Subject line
            text: `This report containing charging details of ${source}, day-wise for the month of ${monthNames[fromDuplicate.getMonth()]}`,
            attachments:[
                {
                    filename: dateWiseChargingDetails,
                    path: dateWiseChargingDetailsFilePath
                }
            ]
        });

        console.log("=> [dateWiseChargingDetails][emailSent]",info);
        fs.unlink(dateWiseChargingDetailsFilePath,function(err,data) {
            if (err) {
                console.log("=> File not deleted[dateWiseChargingDetails]");
            }
            console.log("=> File deleted [dateWiseChargingDetails]");
        });
    }catch(e){
        console.log("=> Error [dateWiseChargingDetails]", e);
    }
    
}

getArray = async(records) => {
    let ids = [];
    for(let i = 0; i < records.length; i++){
        ids.push(records[i].subscriber_id);
    }
    return ids;
}

function isDataPresent(array, user_id) {
    const result = array.find(o => o.user_id === user_id);
    return result;
}

function getViewLogs(user_id){
    return new Promise(async(resolve, reject) => {
        try{
            let viewLog = await viewLogsRepo.getLatestViewLog(user_id);
            if(viewLog){
                resolve(viewLog);
            }else{
                reject("Not found");
            }
        }catch(err){
            reject(err);
        }
    });
}

function getNumberOfViewLogs(user_id){
    return new Promise(async(resolve, reject) => {
        try{
            let viewLog = await viewLogsRepo.getNumberOfViewLogs(user_id);
            if(viewLog){
                resolve(viewLog);
            }else{
                reject("Not found");
            }
        }catch(err){
            reject(err);
        }
    });
}

function getCurrentDate(){
    var dateObj = new Date();
    var month = dateObj.getMonth() + 1; //months from 1-12
    var day = dateObj.getDate();
    var year = dateObj.getFullYear();
    let newdate = day + "-" + month + "-" + year;
    return newdate;
}

module.exports = {
    dailyReport: dailyReport,
    callBacksReport: callBacksReport,
    errorCountReport: errorCountReport,
    dailyUnsubReport: dailyUnsubReport,
    dailyFullAndPartialChargedUsers: dailyFullAndPartialChargedUsers,
    dailyTrialToBilledUsers: dailyTrialToBilledUsers,
    dailyChannelWiseUnsub: dailyChannelWiseUnsub,
    dailyChannelWiseTrialActivated: dailyChannelWiseTrialActivated,
    dailyPageViews: dailyPageViews,
    getTotalUserBaseTillDate: getTotalUserBaseTillDate,
    getExpiredBase: getExpiredBase,
    getInactiveBase: getInactiveBase,
    getInactiveBaseHavingViewLogsLessThan3: getInactiveBaseHavingViewLogsLessThan3,
    dailyNetAddition: dailyNetAddition,
    avgTransactionPerCustomer: avgTransactionPerCustomer,
    dailyReturningUsers: dailyReturningUsers,
    weeklyRevenue: weeklyRevenue,
    getActiveBase: getActiveBase,
    getOnlySubscriberIds: getOnlySubscriberIds,
    weeklyTransactingCustomers: weeklyTransactingCustomers,
    generateReportForAcquisitionSourceAndNoOfTimeUserBilled: generateReportForAcquisitionSourceAndNoOfTimeUserBilled,
    getUsersNotSubscribedAfterSubscribe: getUsersNotSubscribedAfterSubscribe,
    generateUsersReportWithTrialAndBillingHistory:generateUsersReportWithTrialAndBillingHistory
}