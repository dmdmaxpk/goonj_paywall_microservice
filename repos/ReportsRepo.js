const mongoose = require('mongoose');
const container = require("../configurations/container");
const Subscriber = mongoose.model('Subscriber');
const Subscription = mongoose.model('Subscription');
const BillingHistory = mongoose.model('BillingHistory');
const User = mongoose.model('User');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');

const billinghistoryRepo = container.resolve('billingHistoryRepository');
const subscriptionRepo = container.resolve('subscriptionRepository');

var nodemailer = require('nodemailer');
var usersRepo = container.resolve('userRepository');
var viewLogsRepo = require('../repos/ViewLogRepo');

var pageViews = require('../controllers/PageViews');


let currentDate = null;
currentDate = getCurrentDate();

let paywallTotalBase = currentDate+"_PaywallTotalBase.csv";
let paywallTotalBaseFilePath = `./${paywallTotalBase}`;

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

const csvAffiliatePvs = createCsvWriter({
    path: affiliatePvsFilePath,
    header: [
        {id: '_id', title: 'Date'},
        {id: 'count', title: "Page Views"},
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

dailyReport = async(mode = 'prod') => {
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

        console.log("[dailyReport]Subscription Stats",subscription_status_stats);
        
        let totalActiveSubscribers = subscription_status_stats.reduce((accum,elem) => {
            if (elem._id.subscription_status === "trial" || elem._id.subscription_status === "graced" || elem._id.subscription_status === "billed") {
                return accum = accum + elem.count; 
            }
            return accum;
        },0);
        console.log("[dailyReport]Total Active Subscribers",totalActiveSubscribers);

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
    console.log("[dailyReport]Reached HEre 1");

    let totalUserStats = await User.count({ "added_dtm": { "$gte": reportStartDate ,$lt: myToday  },active:true } );
    let totalSubscriberStats = await Subscription.count({ "added_dtm": { "$gte": reportStartDate ,$lt: myToday  },active:true } );
    let totalExpiredCount = await BillingHistory.count({"billing_dtm": { "$gte": reportStartDate ,$lt: myToday  },billing_status: "expired"} );
    console.log("[dailyReport]totalExpiredCount",totalExpiredCount);


    let billingStats = await BillingHistory.aggregate([
            { $match: { "billing_status": {$in : ["Success","expired"]}, "billing_dtm": { "$gte": reportStartDate ,$lt: myToday  } } },
            {$group: {_id: {"day": {"$dayOfMonth" : "$billing_dtm"}, "month": { "$month" : "$billing_dtm" },
                "year":{ $year: "$billing_dtm" },billing_status: "$billing_status",package_id: "$package_id" } , revenue:{ $sum: "$price" },count:{$sum: 1} } },
            {$project: {  "date":{"$dateFromParts":{ year: "$_id.year","month":"$_id.month","day":"$_id.day" }},
                "revenue": "$revenue","count":"$count",_id:-1 }},{$sort: {"date": -1}}
        ]);       
        console.log("[dailyReport]Reached HEre 2");
    let trialStats = await BillingHistory.aggregate([
        { $match: { "billing_status": "trial","billing_dtm": { "$gte": reportStartDate ,$lt: myToday  }  } },
        {$group: {_id: {"day": {"$dayOfMonth" : "$billing_dtm"}, "month": { "$month" : "$billing_dtm" },
            "year":{ $year: "$billing_dtm" } } , trials:{ $sum: 1 } } },
        {$project: {  "date":{"$dateFromParts":{ year: "$_id.year","month":"$_id.month","day":"$_id.day" }}, 
            "trials": "$trials",_id:-1 }},{$sort: {"date": -1}}
    ]);
    console.log("[dailyReport]Reached HEre 3");
    

    let resultToWrite = {};
    userStats.forEach(userStat => {
        if(userStat.date){
            resultToWrite[userStat.date.toDateString()] =  {};
        }
    });
    let totalUsers = totalUserStats;
    userStats.forEach(userStat => {
        if(userStat.date){
            resultToWrite[userStat.date.toDateString()]['newUser'] = userStat.count;
            totalUsers = totalUsers - userStat.count;
            resultToWrite[userStat.date.toDateString()]['totalUsers'] = totalUsers;
        }
    });
    var totalSubscriber = totalSubscriberStats;
    susbcriberStats.forEach(subsc => {
        if(subsc.date){
            resultToWrite[subsc.date.toDateString()]['newSubscriber'] = subsc.count;
            totalSubscriber = totalSubscriber - subsc.count;
            resultToWrite[subsc.date.toDateString()]['totalSubscribers'] = totalSubscriber;
        }
    });
    let totalExpiredCountt = totalExpiredCount;
    console.log("[dailyReport]Reached HEre 4");

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
    console.log("[dailyReport]Reached HEre 5");

    trialStats.forEach(trialStat => {
        if(resultToWrite[trialStat.date.toDateString()]) {
            resultToWrite[trialStat.date.toDateString()]['trials'] = trialStat.trials;
        }
    });
    // console.log("myDate",dayBeforeYesterday.toDateString());
    // console.log("myToday",resultToWrite[dayBeforeYesterday.toDateString()]);
    resultToWrite[dayBeforeYesterday.toDateString()]["tempTotalActiveSubscribers"] = totalActiveSubscribers; 

    let resultToWriteToCsv= [];
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

    try {  
        csvWriter.writeRecords(resultToWriteToCsv).then(async (data) => {
            var info = await transporter.sendMail({
                from: 'paywall@dmdmax.com.pk', // sender address
                to:  ['paywall@dmdmax.com.pk'],
                // to:  ["paywall@dmdmax.com.pk","zara.naqi@telenor.com.pk","mikaeel@dmdmax.com","ceo@ideationtec.com","asad@ideationtec.com","usama.abbasi@ideationtec.com","fahad.shabbir@ideationtec.com","junaid.basir@telenor.com.pk" ], // list of receivers
                subject: `Paywall Report`, // Subject line
                text: `PFA some basic stats for Paywall - ${(new Date()).toDateString()}`, // plain text bodyday
                attachments:[
                    {
                        filename: paywallRevFileName,
                        path: paywallRevFilePath
                    }
                ]
            });
            console.log("[dailyReport]Reached HEre 6",info);
            fs.unlink(paywallRevFilePath,function(err,data) {
                if (err) {
                    console.log("[dailyReport]File not deleted");
                }
                console.log("[dailyReport]data");
            });
            console.log("[dailyReport]info",info);
        }).catch(er => {
            console.log("[dailyReport]err",er)
        })
    } catch(err) {
        console.log("[dailyReport]",err);
    }

    console.log("[dailyReport]resultToWrite",resultToWriteToCsv);
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
            to:  ["paywall@dmdmax.com.pk"],
            // to:  ["paywall@dmdmax.com.pk","zara.naqi@telenor.com.pk","mikaeel@dmdmax.com","ceo@ideationtec.com","asad@ideationtec.com","usama.abbasi@ideationtec.com","fahad.shabbir@ideationtec.com" ], // list of receivers
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
        {id: "count",title: "Unsubscribe Count" }
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
        let errorReport = await billinghistoryRepo.errorCountReport();
        await errorCountReportWriter.writeRecords(errorReport);
        await errorCountReportBySource.writeRecords(errorBySourceReport);
        var info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk', // sender address
            //to:  ["farhan.ali@dmdmax.com"],
            to:  ["paywall@dmdmax.com.pk","mikaeel@dmdmax.com"], // list of receivers
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
        console.log("[errorCountReport][emailSent]",info);
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
        console.error(error);
    }
}

dailyUnsubReport = async() => {
    try {
        let dailyUnsubReport = await billinghistoryRepo.dailyUnsubReport();
        await dailyUnsubReportWriter.writeRecords(dailyUnsubReport);
        var info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk', // sender address
            to:  ["paywall@dmdmax.com.pk"],
            // to:  ["paywall@dmdmax.com.pk","zara.naqi@telenor.com.pk","mikaeel@dmdmax.com"], // list of receivers
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

dailyChannelWiseUnsub = async() => {
    try {
        let records = [];
        let dailyChannelWiseUnsub = await billinghistoryRepo.dailyChannelWiseUnsub();  
        let dailyExpiredBySystem = await billinghistoryRepo.dailyExpiredBySystem();

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
                }
            }else{
                let expiredBySystem = isDatePresent(dailyExpiredBySystem, date);
                let app = (source === "app" || source == "na") ? count : 0;
                let web = source === "web" ? count : 0;
                let sms = source === "sms" ? count : 0;
                let cc = source === "CC" ? count : 0;
                let expired = expiredBySystem !== undefined ? expiredBySystem.count : 0;

                let total = (app + web + sms + cc + expired);

                let object = {date: date, app: app, web: web, sms: sms, cc: cc, expired: expired, total: total};
                records.push(object);
            }
            
        });

        await dailyChannelWiseUnsubWriter.writeRecords(records);

        var info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk', // sender address
            to:  ["paywall@dmdmax.com.pk"],
            // to:  ["paywall@dmdmax.com.pk","zara.naqi@telenor.com.pk","mikaeel@dmdmax.com"], // list of receivers
            subject: `Daily Source Wise Unsubscribed Users Report`, // Subject line
            text: `This report (generated at ${(new Date()).toDateString()}) contains count of unsubscribed users with respect to source.\n\nNote: Expired By System column indicates those users expired by the system because their grace time is over and they still have no balance.`, // plain text bodyday
            attachments:[
                {
                    filename: paywallChannelWiseUnsubReport,
                    path: paywallChannelWiseUnsubReportFilePath
                }
            ]
        });
        console.log("[dailyChannelWiseUnsub][emailSent]",info);
        fs.unlink(paywallChannelWiseUnsubReportFilePath,function(err,data) {
            if (err) {
                console.log("File not deleted[dailyChannelWiseUnsub]");
            }
            console.log("File deleted [dailyChannelWiseUnsub]");
        });
    } catch (error) {
        console.error(error);
    }
}

dailyChannelWiseTrialActivated = async() => {
    try {
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
            to:  ["paywall@dmdmax.com.pk"],
            // to:  ["paywall@dmdmax.com.pk","mikaeel@dmdmax.com"], // list of receivers
            subject: `Source Wise Trial Activated Report`, // Subject line
            text: `This report (generated at ${(new Date()).toDateString()}) contains count of trials activated with respect to source.`, // plain text bodyday
            attachments:[
                {
                    filename: paywallChannelWiseTrial,
                    path: paywallChannelWiseTrialFilePath
                }
            ]
        });
        console.log("[paywallChannelWiseTrial][emailSent]",info);
        fs.unlink(paywallChannelWiseTrialFilePath,function(err,data) {
            if (err) {
                console.log("File not deleted[paywallChannelWiseTrial]");
            }
            console.log("File deleted [paywallChannelWiseTrial]");
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
        let trialToBilled = await usersRepo.dailyTrialToBilledUsers();
        let trialToBilledUsers = [];

        trialToBilled.forEach(element => {
            let trialDate = undefined;
            let BreakException = {};

            try{
                element.usershistory.forEach(subElement => {
                    if(subElement.billing_status === 'trial'){
                        trialDate = new Date(subElement.billing_dtm);
                        trialDate.setHours(0, 0, 0, 0);

                    }else if(subElement.billing_status === 'Success' && (!subElement.micro_charge || (subElement.micro_charge && subElement.micro_charge === false))){
                        let billingDate = new Date(subElement.billing_dtm);
                        billingDate.setHours(0, 0, 0, 0);

                        var trialNextDay = new Date(trialDate);
                        trialNextDay.setDate(trialNextDay.getDate() + 1);

                        if(trialNextDay.getTime() === billingDate.getTime()){
                            // Means user is billed right after next day of trial
                            let currentObj = isMultipleDatePresent(trialToBilledUsers, trialDate);
                            if(currentObj){
                                currentObj.msisdn.push({"msisdn":element.msisdn});
                                currentObj.total = (currentObj.total + 1);
                            }else{
                                //console.log('trialToBilledUsers', trialDate, ' --- ', trialNextDay, ' --- ', billingDate);
                                let object = {};
                                object.trial_date = trialDate;
                                object.billed_date = billingDate;
                                object.msisdn = [{"msisdn":element.msisdn}];
                                object.total = 1;
                                trialToBilledUsers.push(object);
                            }
                            throw BreakException;
                        }
                    }
                });
            }catch(e){
                if(e !== BreakException)
                    throw e;
            }
        });

        let today = new Date();
        today.setHours(today.getHours() - 24);
        today.setHours(0, 0, 0, 0);

        let lastTenDays = new Date();
        lastTenDays.setDate(lastTenDays.getDate() - 11);
        lastTenDays.setHours(0, 0, 0, 0);

        trialToBilledUsers.forEach(element => {
            element.msisdn = JSON.stringify(element.msisdn);
        });

        await csvTrialToBilledUsers.writeRecords(trialToBilledUsers);
        var info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk',
            to:  ["paywall@dmdmax.com.pk"],
            // to:  ["paywall@dmdmax.com.pk", "zara.naqi@telenor.com.pk", "mikaeel@dmdmax.com", "khurram.javaid@telenor.com.pk", "junaid.basir@telenor.com.pk"], // list of receivers
            subject: 'Trial To Billed Users',
            text: `This report (generated at ${(new Date()).toDateString()}) contains count of users who are directly billed after trial from ${lastTenDays} to ${today}.\nNote: You can ignore the current date data.`, // plain text bodyday
            attachments:[
                {
                    filename: paywallTrialToBilledUsers,
                    path: paywallTrialToBilledUsersFilePath
                }
            ]
        });
        console.log("[trialToBilledUsers][emailSent]", info);
        fs.unlink(paywallTrialToBilledUsersFilePath,function(err,data) {
            if (err) {
                console.log("File not deleted");
            }
            console.log("data");
        });
    } catch (error) {
        console.error(error);
    }
}

dailyFullAndPartialChargedUsers = async() => {
    try {
        let dailyReport = await billinghistoryRepo.getDailyFullyChargedAndPartialChargedUsers();
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
            to:  ["paywall@dmdmax.com.pk"],
            // to:  ["paywall@dmdmax.com.pk", "zara.naqi@telenor.com.pk", "mikaeel@dmdmax.com", "khurram.javaid@telenor.com.pk", "junaid.basir@telenor.com.pk"], // list of receivers
            subject: 'Full & Partial Charged Users',
            text: `This report (generated at ${(new Date()).toDateString()}) contains count of full & partial charged users.`, // plain text bodyday
            attachments:[
                {
                    filename: paywallFullAndPartialChargedReport,
                    path: paywallFullAndPartialChargedReportFilePath
                }
            ]
        });
        console.log("[fullAndPartialChargedUsers][emailSent]", info);
        fs.unlink(paywallFullAndPartialChargedReportFilePath,function(err,data) {
            if (err) {
                console.log("File not deleted");
            }
            console.log("data");
        });
    } catch (error) {
        console.error(error);
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
                //to:  ["farhan.ali@dmdmax.com"],
                to:  ["paywall@dmdmax.com.pk", "mikaeel@dmdmax.com"], // list of receivers
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

getExpiredBase = async(from, to) => {
    let result = await usersRepo.getExpiredBase(from, to);
    await csvExpiredBase.writeRecords(result);

    var info = await transporter.sendMail({
        from: 'paywall@dmdmax.com.pk', // sender address
        to:  ["paywall@dmdmax.com.pk", "mikaeel@dmdmax.com"],
        //to:  ["paywall@dmdmax.com.pk","zara.naqi@telenor.com.pk","mikaeel@dmdmax.com"], // list of receivers
        subject: `Paywall Expired Base`, // Subject line
        text: `This report contains total expired base from ${new Date(from)} to ${new Date(to)}.`,
        attachments:[
            {
                filename: paywallExpiredBase,
                path: paywallExpiredBaseFilePath
            }
        ]
    });
    console.log("[expiredBase][emailSent]",info);
    fs.unlink(paywallExpiredBaseFilePath,function(err,data) {
        if (err) {
            console.log("File not deleted[expiredBase]");
        }
        console.log("File deleted [expiredBase]");
    });
}

getInactiveBase = async(from, to) => {
    let result = await usersRepo.getActiveUsers(from, to);

    let totalLength = result.length;
    let count = 0;
    console.log("*** Length: "+totalLength);

    let finalResult = [];
    let fiveDaysBack = new Date();
    fiveDaysBack.setDate(fiveDaysBack.getDate() - 5);

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
            text: `This report contains inactive base from ${new Date(from)} to ${new Date(to)}.\nInActive: Have not opened App/Web in last 5 days but are subscribed users`,
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
    avgTransactionPerCustomer: avgTransactionPerCustomer
}