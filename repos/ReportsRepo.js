const mongoose = require('mongoose');
const Subscriber = mongoose.model('Subscriber');
const BillingHistory = mongoose.model('BillingHistory');
const User = mongoose.model('User');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csvWriter = createCsvWriter({
    path: './report.csv',
    header: [
        {id: 'date', title: 'Date'},
        {id: 'newUser', title: 'New User'},
        {id: 'newSubscriber', title: 'New Subcriber'},
        {id: 'trials', title: 'Trials Activated'},
        {id: 'users_billed', title: 'Users Billed'},
        {id: 'revenue', title: 'Revenue'},

    ]
});
var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
    host: "email-smtp.eu-central-1.amazonaws.com",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: 'AKIAZQA2XAWP7CYJEJXS', // generated ethereal user
      pass: 'BJ/xUCabrqJTDU6PuLFHG0Rh1VDrp6AYAAmIOclEtzRs' // generated ethereal password
    }
  });

dailyReport = async() => {
    let susbcriberStats = await Subscriber.aggregate([
        {$group: {_id: {"day": {"$dayOfMonth" : "$added_dtm"}, "month": { "$month" : "$added_dtm" },"year":{ $year: "$added_dtm" } } , count:{ $sum: 1 } } },
        {$project: {  "date":{"$dateFromParts":{ year: "$_id.year","month":"$_id.month","day":"$_id.day" }}, "count": "$count",_id:-1 }} ,
        { $sort: {"date": -1}}
          ]);
    let userStats = await User.aggregate([
        {$group: {_id: {"day": {"$dayOfMonth" : "$added_dtm"}, "month": { "$month" : "$added_dtm" },
        "year":{ $year: "$added_dtm" }} , count:{ $sum: 1 } } },
        {$project: {  "date":{"$dateFromParts":{ year: "$_id.year","month":"$_id.month","day":"$_id.day" }}, "count": "$count",_id:-1 }},
        {$sort: {"date": -1}} 
    ]);

    let billingStats = await BillingHistory.aggregate([
            { $match: { "billing_status": "Success" } },
            {$group: {_id: {"day": {"$dayOfMonth" : "$billing_dtm"}, "month": { "$month" : "$billing_dtm" },
                "year":{ $year: "$billing_dtm" } } , revenue:{ $sum: "$price" },count:{$sum: 1} } },
            {$project: {  "date":{"$dateFromParts":{ year: "$_id.year","month":"$_id.month","day":"$_id.day" }}, 
                "revenue": "$revenue","count":"$count",_id:-1 }},{$sort: {"date": -1}}
        ]);       
    
    let trialStats = await BillingHistory.aggregate([
        { $match: { "billing_status": "trial" } },
        {$group: {_id: {"day": {"$dayOfMonth" : "$billing_dtm"}, "month": { "$month" : "$billing_dtm" },
            "year":{ $year: "$billing_dtm" } } , trials:{ $sum: 1 } } },
        {$project: {  "date":{"$dateFromParts":{ year: "$_id.year","month":"$_id.month","day":"$_id.day" }}, 
            "trials": "$trials",_id:-1 }},{$sort: {"date": -1}}
    ]);    

    let resultToWrite= {};
    userStats.forEach(userStat => {
        resultToWrite[userStat.date.toDateString()] =  {};
    });

    userStats.forEach(userStat => {
        resultToWrite[userStat.date.toDateString()]['newUser'] = userStat.count;
    });

    susbcriberStats.forEach(subsc => {
        resultToWrite[subsc.date.toDateString()]['newSubscriber'] = subsc.count;
    });

    billingStats.forEach(billingHistor => {
        console.log(billingHistor.date.toDateString());
        if(resultToWrite[billingHistor.date.toDateString()]) {
            resultToWrite[billingHistor.date.toDateString()]['revenue'] = billingHistor.revenue;
            resultToWrite[billingHistor.date.toDateString()]['users_billed'] = billingHistor.count;
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
            revenue: resultToWrite[res].revenue, users_billed: resultToWrite[res].users_billed, trials: resultToWrite[res].trials }
        resultToWriteToCsv.push(temp);
    } 

    try {
        csvWriter.writeRecords(resultToWriteToCsv).then(async (data) => {
            var info = await transporter.sendMail({
                from: 'paywall@dmdmax.com.pk', // sender address
                to: ["paywall@dmdmax.com.pk"], // list of receivers
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