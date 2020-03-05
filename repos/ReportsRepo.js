const mongoose = require('mongoose');
const Subscriber = mongoose.model('Subscriber');
const BillingHistory = mongoose.model('BillingHistory');
const User = mongoose.model('User');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const csvWriter = createCsvWriter({
    path: './report.csv',
    header: [
        {id: 'date', title: 'Date'},
        {id: 'newUser', title: 'Number Verified Users'},
        {id: 'newSubscriber', title: 'New Subscribers'},
        {id: 'totalSubscribers', title: 'Total Subscribers'},
        {id: 'trials', title: 'Trials Activated'},
        {id: 'tempTotalActiveSubscribers',title: 'Total Active Subscribers'},
        {id: 'liveOnlyCount', title: 'Users Billed Live Only'},
        {id: 'pslOnlyCount', title: 'Users Billed PSL Only'},
        {id: 'liveAndPSLCount', title: 'Users Billed Live And PSL'},
        {id: 'liveOnly', title: 'Live Only Revenue'},
        {id: 'pslOnly', title: 'PSL Only Revenue'},
        {id: 'liveAndPSL', title: 'Live And PSL Revenue'},
        {id: 'totalRevenue',title: 'Total Revenue'}

    ]
});


const csvReportWriter = createCsvWriter({
    path: './callBackReport.csv',
    header: [
        {id: 'tid', title: 'TID'},
        {id: 'mid', title: 'MID'},
        {id: "isCallbAckSent",title: "IS CallBack Sent" },
        {id: 'added_dtm', title: 'User TIMESTAMP'},
        {id: 'callBackSentTime', title: 'TIMESTAMP'}
    ]
});
var nodemailer = require('nodemailer');

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
    let susbcriberStats = await Subscriber.aggregate([
        {
            "$match": 
            {
                "added_dtm": { "$gte": reportStartDate ,$lt: myToday  }
            }
        },
        {$group: {_id: {"day": {"$dayOfMonth" : "$added_dtm"}, "month": { "$month" : "$added_dtm" },"year":{ $year: "$added_dtm" } } , count:{ $sum: 1 } } },
        {$project: {  "date":{"$dateFromParts":{ year: "$_id.year","month":"$_id.month","day":"$_id.day" }}, "count": "$count",_id:-1 }} ,
        { $sort: {"date": -1}}
          ]);
    
    let subscription_status_stats = await Subscriber.aggregate([
        {
            "$match": 
            {
                "added_dtm": { "$gte": reportStartDate ,$lt: myToday  }
            }
        },
        {$group: {_id: {subscription_status: "$subscription_status" } , count:{ $sum: 1 } } },
        {$project: {  "count": "$count",_id: 1 }} ,
        { $sort: {"date": -1}}
          ]);

        console.log("Subscription Stats",subscription_status_stats);
        
        let totalActiveSubscribers = subscription_status_stats.reduce((accum,elem) => {
            if (elem._id.subscription_status === "trial" || elem._id.subscription_status === "graced" || elem._id.subscription_status === "billed") {
                return accum = accum + elem.count; 
            }
            return accum;
        },0);
        console.log("Total Active Subscribers",totalActiveSubscribers);

    let userStats = await User.aggregate([
            {
                "$match": 
                {
                    "added_dtm": { "$gte": reportStartDate ,$lt: myToday  }
                }
            },
        {$group: {_id: {"day": {"$dayOfMonth" : "$added_dtm"}, "month": { "$month" : "$added_dtm" },
        "year":{ $year: "$added_dtm" }} , count:{ $sum: 1 } } },
        {$project: {  "date":{"$dateFromParts":{ year: "$_id.year","month":"$_id.month","day":"$_id.day" }}, "count": "$count",_id:-1 }},
        {$sort: {"date": -1}} 
    ]);

    let totalUserStats = await User.count({ "added_dtm": { "$gte": reportStartDate ,$lt: myToday  } } );
    let totalSubscriberStats = await Subscriber.count({ "added_dtm": { "$gte": reportStartDate ,$lt: myToday  } } );
    let totalExpiredCount = await BillingHistory.count({"billing_dtm": { "$gte": reportStartDate ,$lt: myToday  },billing_status: "expired"} );
    console.log("totalExpiredCount",totalExpiredCount);


    let billingStats = await BillingHistory.aggregate([
            { $match: { "billing_status": {$in : ["Success","expired"]}, "billing_dtm": { "$gte": reportStartDate ,$lt: myToday  } } },
            {$group: {_id: {"day": {"$dayOfMonth" : "$billing_dtm"}, "month": { "$month" : "$billing_dtm" },
                "year":{ $year: "$billing_dtm" },billing_status: "$billing_status",package_id: "$package_id" } , revenue:{ $sum: "$price" },count:{$sum: 1} } },
            {$project: {  "date":{"$dateFromParts":{ year: "$_id.year","month":"$_id.month","day":"$_id.day" }},
                "revenue": "$revenue","count":"$count",_id:-1 }},{$sort: {"date": -1}}
        ]);       
    
    let trialStats = await BillingHistory.aggregate([
        { $match: { "billing_status": "trial","billing_dtm": { "$gte": reportStartDate ,$lt: myToday  }  } },
        {$group: {_id: {"day": {"$dayOfMonth" : "$billing_dtm"}, "month": { "$month" : "$billing_dtm" },
            "year":{ $year: "$billing_dtm" } } , trials:{ $sum: 1 } } },
        {$project: {  "date":{"$dateFromParts":{ year: "$_id.year","month":"$_id.month","day":"$_id.day" }}, 
            "trials": "$trials",_id:-1 }},{$sort: {"date": -1}}
    ]);

    

    let resultToWrite= {};
    userStats.forEach(userStat => {
        resultToWrite[userStat.date.toDateString()] =  {};
    });
    let totalUsers = totalUserStats;
    userStats.forEach(userStat => {
        resultToWrite[userStat.date.toDateString()]['newUser'] = userStat.count;
        totalUsers = totalUsers - userStat.count;
        resultToWrite[userStat.date.toDateString()]['totalUsers'] = totalUsers;
    });
    var totalSubscriber = totalSubscriberStats;
    susbcriberStats.forEach(subsc => {
        resultToWrite[subsc.date.toDateString()]['newSubscriber'] = subsc.count;
        totalSubscriber = totalSubscriber - subsc.count;
        resultToWrite[subsc.date.toDateString()]['totalSubscribers'] = totalSubscriber;

    });
    let totalExpiredCountt = totalExpiredCount;
    billingStats.forEach(billingHistor => {
        // console.log(billingHistor);
        if(resultToWrite[billingHistor.date.toDateString()] && billingHistor._id["billing_status"] === "Success") {
            console.log("billingHistor",billingHistor);
            if (billingHistor._id.package_id === "QDfC") {
                resultToWrite[billingHistor.date.toDateString()]['revenue-liveonly'] = billingHistor.revenue;
                resultToWrite[billingHistor.date.toDateString()]['users-billed-liveonly'] = billingHistor.count;
            }
            if (billingHistor._id.package_id === "QDfD") {
                resultToWrite[billingHistor.date.toDateString()]['revenue-pslonly'] = billingHistor.revenue;
                resultToWrite[billingHistor.date.toDateString()]['users-billed-pslonly'] = billingHistor.count;
            }
            if (billingHistor._id.package_id === "QDfE") {
                resultToWrite[billingHistor.date.toDateString()]['revenue-liveandPSL'] = billingHistor.revenue;
                resultToWrite[billingHistor.date.toDateString()]['users-billed-pslandlive'] = billingHistor.count;
            }
        } else if (resultToWrite[billingHistor.date.toDateString()] && billingHistor._id["billing_status"] === "expired")  {
            console.log("expired On the day",billingHistor.count);
            console.log("date",billingHistor.date.toDateString());
            totalExpiredCountt = totalExpiredCountt - billingHistor.count;
            console.log("totalExpiredCountt",totalExpiredCountt);
            resultToWrite[billingHistor.date.toDateString()]['users_expired'] = billingHistor.count;
            resultToWrite[billingHistor.date.toDateString()]['users_expired_till_today'] = totalExpiredCountt;
        }
    });

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
        let liveRevenue = (resultToWrite[res]["revenue-liveonly"])?resultToWrite[res]["revenue-liveonly"]:0;
        let pslRevenue = (resultToWrite[res]["revenue-pslonly"])?resultToWrite[res]["revenue-pslonly"]:0;
        let pslAndLiveRevenue = (resultToWrite[res]["revenue-liveandPSL"])?resultToWrite[res]["revenue-liveandPSL"]:0 ;
        let totalRevenue = liveRevenue + pslRevenue + pslAndLiveRevenue;
        let temp = {date: res, newUser: resultToWrite[res].newUser , newSubscriber: resultToWrite[res].newSubscriber,
            liveOnlyCount: resultToWrite[res]["users-billed-liveonly"]  ,liveOnly: resultToWrite[res]["revenue-liveonly"],
            pslOnlyCount: resultToWrite[res]["users-billed-pslonly"] ,pslOnly: resultToWrite[res]["revenue-pslonly"],
            liveAndPSLCount: resultToWrite[res]["users-billed-pslandlive"],liveAndPSL: resultToWrite[res]["revenue-liveandPSL"],
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
                 to: ["farhan.ali@dmdmax.com"],
                //to:  ["paywall@dmdmax.com.pk","Tauseef.Khan@telenor.com.pk","zara.naqi@telenor.com.pk","sherjeel.hassan@telenor.com.pk","mikaeel@dmdmax.com",
                //"mikaeel@dmdmax.com.pk","ceo@ideationtec.com","asad@ideationtec.com","usama.abbasi@ideationtec.com","fahad.shabbir@ideationtec.com" ], // list of receivers
                subject: `PayWall Report`, // Subject line
                text: `PFA some basic stats for Paywall - ${(new Date()).toDateString()}`, // plain text bodyday
                attachments:[
                    {
                        filename: "report.csv",
                        path: "./report.csv"
                    }
                ]
            });
            fs.unlink("./report.csv",function(err,data) {
                if (err) {
                    console.log("File not deleted");
                }
                console.log("data");
            });
            console.log("info",info);
        }).catch(er => {
            console.log("err",er)
        })
    } catch(err) {
        console.log(err);
    }


    console.log("resultToWrite",resultToWriteToCsv);
}


callBacksReport =async() => {
    try { 
        let startDate = new Date("2020-02-18T09:16:28.315Z");
        let report =  await User.aggregate([ 
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
                        foreignField: "user_id",        
                        as: "histories" 
                    } 
            },
            { 
                $project: { 
                    tid: "$affiliate_unique_transaction_id",
                    mid: "$affiliate_mid",
                    added_dtm: "$added_dtm",
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
                added_dtm: "$added_dtm",
                callbackhistorySize: {"$size": "$callbackhistory" },
                callbackObj: {$arrayElemAt: ["$callbackhistory",0]} 
                }
            }, 
            { 
                $project: { 
                tid: "$tid",
                mid: "$mid",
                added_dtm: "$added_dtm",
                isCallbAckSent: {"$cond": { if: {$gte: ["$callbackhistorySize",1] },then:"yes",else:"no" } },
                callBackSentTime: "$callbackObj.billing_dtm" 
                }
            }
        ]);

        let write = await csvReportWriter.writeRecords(report);
        var info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk', // sender address
            to:  ["paywall@dmdmax.com.pk","Tauseef.Khan@telenor.com.pk","zara.naqi@telenor.com.pk","sherjeel.hassan@telenor.com.pk","mikaeel@dmdmax.com",
            "mikaeel@dmdmax.com.pk","ceo@ideationtec.com","asad@ideationtec.com","usama.abbasi@ideationtec.com","fahad.shabbir@ideationtec.com" ], // list of receivers
            subject: `CallBacks Report ${(new Date()).toDateString()}`, // Subject line
            text: `Callbacks sent with their TIDs and timestamps. `, // plain text bodyday
            attachments:[
                {
                    filename: "callBackReport.csv",
                    path: "./callBackReport.csv"
                }
            ]
        });
        console.log("Report",info);
        fs.unlink("./callBackReport.csv",function(err,data) {
            if (err) {
                console.log("File not deleted");
            }
            console.log("data");
        });
    } catch(err) {
        console.log("Error",err);
    }
    
}

module.exports = {
    dailyReport: dailyReport,
    callBacksReport: callBacksReport
}