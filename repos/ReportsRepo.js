const mongoose = require('mongoose');
const Subscriber = mongoose.model('Subscriber');
const BillingHistory = mongoose.model('BillingHistory');
const User = mongoose.model('User');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csvWriter = createCsvWriter({
    path: './report.csv',
    header: [
        {id: 'date', title: 'Date'},
        {id: 'newUser', title: 'Number Verified Users'},
        {id: 'newSubscriber', title: 'New Subscribers'},
        {id: 'totalSubscribers', title: 'Total Subscribers'},
        {id: 'totalActiveSubscribers', title: 'Total Active Subscribers' },
        {id: 'trials', title: 'Trials Activated'},
        {id: 'users_billed', title: 'Users Billed'},
        {id: 'revenue', title: 'Revenue'},

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
    let susbcriberStats = await Subscriber.aggregate([
        {
            "$match": 
            {
                "added_dtm": { "$gte": new Date("2020-02-07T00:00:00.672Z") }
            }
        },
        {$group: {_id: {"day": {"$dayOfMonth" : "$added_dtm"}, "month": { "$month" : "$added_dtm" },"year":{ $year: "$added_dtm" } } , count:{ $sum: 1 } } },
        {$project: {  "date":{"$dateFromParts":{ year: "$_id.year","month":"$_id.month","day":"$_id.day" }}, "count": "$count",_id:-1 }} ,
        { $sort: {"date": -1}}
          ]);
    let userStats = await User.aggregate([
            {
                "$match": 
                {
                    "added_dtm": { "$gte": new Date("2020-02-07T00:00:00.672Z") }
                }
            },
        {$group: {_id: {"day": {"$dayOfMonth" : "$added_dtm"}, "month": { "$month" : "$added_dtm" },
        "year":{ $year: "$added_dtm" }} , count:{ $sum: 1 } } },
        {$project: {  "date":{"$dateFromParts":{ year: "$_id.year","month":"$_id.month","day":"$_id.day" }}, "count": "$count",_id:-1 }},
        {$sort: {"date": -1}} 
    ]);

    let totalUserStats = await User.count({"added_dtm": { "$gte": new Date("2020-02-07T00:00:00.672Z") }} );
    let totalSubscriberStats = await Subscriber.count({"added_dtm": { "$gte": new Date("2020-02-07T00:00:00.672Z") }} );


    let billingStats = await BillingHistory.aggregate([
            { $match: { "billing_status": {$in : ["Success","expired"]}, "billing_dtm": { "$gte": new Date("2020-02-07T00:00:00.672Z") } } },
            {$group: {_id: {"day": {"$dayOfMonth" : "$billing_dtm"}, "month": { "$month" : "$billing_dtm" },
                "year":{ $year: "$billing_dtm" },billing_status: "$billing_status" } , revenue:{ $sum: "$price" },count:{$sum: 1} } },
            {$project: {  "date":{"$dateFromParts":{ year: "$_id.year","month":"$_id.month","day":"$_id.day" }}, billing_status: "$billing_status",
                "revenue": "$revenue","count":"$count",_id:-1 }},{$sort: {"date": -1}}
        ]);       
    
    let trialStats = await BillingHistory.aggregate([
        { $match: { "billing_status": "trial","billing_dtm": { "$gte": new Date("2020-02-07T00:00:00.672Z") }  } },
        {$group: {_id: {"day": {"$dayOfMonth" : "$billing_dtm"}, "month": { "$month" : "$billing_dtm" },
            "year":{ $year: "$billing_dtm" } } , trials:{ $sum: 1 } } },
        {$project: {  "date":{"$dateFromParts":{ year: "$_id.year","month":"$_id.month","day":"$_id.day" }}, 
            "trials": "$trials",_id:-1 }},{$sort: {"date": -1}}
    ]);

    let currSusbcriberState = await Subscriber.aggregate([
        { $match: {"added_dtm": {$gte: new Date("2020-01-28T11:06:00.315Z") } } }, 
        {$group: {_id: "$subscription_status",count: {$sum:1}}}
        ]);
    
    console.log('currSusbcriberState',currSusbcriberState)

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
    let dailyUsersExpired = 0;
    billingStats.forEach(billingHistor => {
        console.log(billingHistor);
        if(resultToWrite[billingHistor.date.toDateString()] && billingHistor._id["billing_status"] === "Success") {
            resultToWrite[billingHistor.date.toDateString()]['revenue'] = billingHistor.revenue;
            resultToWrite[billingHistor.date.toDateString()]['users_billed'] = billingHistor.count;
        } else if (resultToWrite[billingHistor.date.toDateString()] && billingHistor._id["billing_status"] === "expired")  {
            console.log('users_expired',billingHistor.count);
            dailyUsersExpired = dailyUsersExpired + billingHistor.count;
            resultToWrite[billingHistor.date.toDateString()]['users_expired'] = billingHistor.count;
            resultToWrite[billingHistor.date.toDateString()]['users_expired_till_today'] = billingHistor.count;
        }
    });

    trialStats.forEach(trialStat => {
        console.log(trialStat.date.toDateString());
        if(resultToWrite[trialStat.date.toDateString()]) {
            resultToWrite[trialStat.date.toDateString()]['trials'] = trialStat.trials;
        }
    });

    let resultToWriteToCsv= [];
    for (res in resultToWrite) {
        let temp = {date: res, newUser: resultToWrite[res].newUser , newSubscriber: resultToWrite[res].newSubscriber,
            revenue: resultToWrite[res].revenue, users_billed: resultToWrite[res].users_billed, trials: resultToWrite[res].trials,
            totalUsers : resultToWrite[res].totalUsers, totalSubscribers: resultToWrite[res].totalSubscribers, totalActiveSubscribers : (resultToWrite[res].totalSubscribers - resultToWrite[res].users_expired_till_today < 0)? 0 : resultToWrite[res].totalSubscribers - resultToWrite[res].users_expired_till_today   }
        resultToWriteToCsv.push(temp);
    } 

    try {  
        var recievers;
        if (mode = 'prod') {
            recievers = ["paywall@dmdmax.com.pk","Tauseef.Khan@telenor.com.pk","zara.naqi@telenor.com.pk","sherjeel.hassan@telenor.com.pk","mikaeel@dmdmax.com","mikaeel@dmdmax.com.pk","ceo@ideationtec.com"]
        } else if (mode = 'test') {
            recievers = ["paywall@dmdmax.com.pk"];
        }
        csvWriter.writeRecords(resultToWriteToCsv).then(async (data) => {
            var info = await transporter.sendMail({
                from: 'paywall@dmdmax.com.pk', // sender address
                to:  recievers, // list of receivers
                subject: `PayWall Report ${(new Date()).toDateString()}`, // Subject line
                text: `PFA some basic stats for Paywall. `, // plain text bodyday
                attachments:[
                    {
                        filename: "report.csv",
                        path: "./report.csv"
                    }
                ]
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


module.exports = {
    dailyReport: dailyReport
}