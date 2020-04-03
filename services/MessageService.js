const messageRepo = require('../repos/MessageRepo');
const userRepo = require('../repos/UserRepo');
const billinghistoryRepo = require('../repos/BillingHistoryRepo');
const subscriberRepo = require("../repos/SubscriberRepo");
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const csvWriter = createCsvWriter({
    path: './temp_report.csv',
    header: [
        {id: 'source', title: 'Source'},
        {id: 'tid', title: 'Unique Transaction Id'},
        {id: 'mid', title: 'Affiliate MID'},
        {id: 'dsla', title: 'DSLA'},
        {id: 'balance', title: 'Blance'}
    ]
});

changePackageOfUsers = async() => {
    try {
        let users = await userRepo.getPslPackageUsers();
        users.forEach(async (user) => {
            console.log("processing",user._id);
            if (user.subscription_status === "expired" || user.subscription_status === "not_billed") {
                // TODO just change user package do not send message set is PackageChanged boolean to true
                console.log("changed package id for user: ",user._id);
                await userRepo.updateUserById(user._id,{is_package_changed: true,subscribed_package_id: "QDfC"});
                let billinghistory = {
                    user_id: user._id,
                    source: user.source,
                    billing_status: "changed_package_on_tp_request"
                }
                billinghistoryRepo.createBillingHistory(billinghistory);
            } else if (user.subscription_status === "graced" || user.subscription_status === "billed" || user.subscription_status === "trial" ) {
                // TODO change user package and also send  message set is package changed and isMessageSet Boolean to true
                console.log("sent message and changed package id for user: ",user._id);
                await userRepo.updateUserById(user._id,{is_package_changed: true,is_message_sent:true,subscribed_package_id: "QDfC"});
                let billinghistory = {
                    user_id: user._id,
                    source: user.source,
                    billing_status: "changed_package_on_tp_request"
                }
                billinghistoryRepo.createBillingHistory(billinghistory);
                let link = `https://www.goonj.pk/goonjplus/unsubscribe?uid=${user._id}`;
                let text = `Moaziz Sarif PSL mautali k bais apki Goonj sub LiveTv par tabdeel ki gye hai Rs8 mein. To unsub click ${link}`;
                messageRepo.sendSmsToUser(text,user.msisdn);
            }
        });
    } catch(err) {
        throw err;
    }
}



changePackageOfPSLOnlyUsers = async() => {
    try {
        let users = await userRepo.getPslOnlyPackageUsers();
        users.forEach(async (user) => {
            console.log("processing",user._id);
            if (user.subscription_status === "expired" || user.subscription_status === "not_billed") {
                // TODO just change user package do not send message set is PackageChanged boolean to true
                console.log("changed package id for user: ",user._id);
                await userRepo.updateUserById(user._id,{is_package_changed: true,subscribed_package_id: "QDfC"});
                let billinghistory = {
                    user_id: user._id,
                    source: user.source,
                    billing_status: "changed_package_on_tp_request"
                }
                billinghistoryRepo.createBillingHistory(billinghistory);
            } else if (user.subscription_status === "graced" || user.subscription_status === "billed" || user.subscription_status === "trial" ) {
                // TODO change user package and also send  message set is package changed and isMessageSet Boolean to true
                console.log("sent message and changed package id for user: ",user._id);
                await userRepo.updateUserById(user._id,{is_package_changed: true,is_message_sent:true,subscribed_package_id: "QDfC"});
                await subscriberRepo.updateSubscriber(user._id,{is_discounted: true,discounted_price:5.99});
                let billinghistory = {
                    user_id: user._id,
                    source: user.source,
                    billing_status: "changed_package_on_tp_request"
                }
                billinghistoryRepo.createBillingHistory(billinghistory);
                let link = `https://www.goonj.pk/goonjplus/unsubscribe?uid=${user._id}`;
                let text = `Moaziz Sarif PSL mautali k bais apki Goonj sub LiveTv par tabdeel ki gye hai Rs5.99 mein. To unsub click ${link}`;
                messageRepo.sendSmsToUser(text,user.msisdn);
            }
        });
    } catch(err) {
        console.log("error",error);
    }
}


usersCheckingScript = async() => {
    let toWriteToCSV= [];
    let countUntrackedUsers = 0;
    let usersNotActiveFormonth = 0;
    let usersNotActiveLastMonth = 0;
    let userMsisdns = [];
    fs.createReadStream('zara_data.csv')
        .pipe(csv())
        .on('data', async (row) => {
            let msisdn = '0' + row.msisdn.slice(2) ;
            userMsisdns.push({msisdn:msisdn,dsla : row['DSLA (# of days)'],balance: row['BALANCE'] });
            // console.log(user.source)
            if (row['DSLA (# of days)'] === '?'){
                countUntrackedUsers++;
            }
            if (row['DSLA (# of days)'] > 60){
                usersNotActiveFormonth++;
            }
            if (row['DSLA (# of days)'] <= 60){
                usersNotActiveLastMonth++;
            }
        })
        .on('end', async () => {
            console.log('CSV file successfully processed',countUntrackedUsers,usersNotActiveFormonth,usersNotActiveLastMonth);
            let HECOunt= 0 ;
            let NotHECOunt= 0 ;
            for (let i= 0;i<userMsisdns.length; i++) {
                let user = await userRepo.getUserByMsisdn(userMsisdns[i]['msisdn']);
                let temp = {source: user.source,tid: user.affiliate_unique_transaction_id,mid: user.affiliate_mid,dsla: userMsisdns[i]['dsla']
                    ,balance: userMsisdns[i]['balance']};
                toWriteToCSV.push(temp);
                console.log("temp",temp);
                if (user.source === "HE") {
                    HECOunt++;
                } else {
                    NotHECOunt++;
                }
            }
            console.log("source",HECOunt,NotHECOunt);
            csvWriter.writeRecords(toWriteToCSV).then(data => {
                console.log(data);
            }).catch(err => {console.log("err",error)})
        });

}

module.exports = {
    changePackageOfUsers: changePackageOfUsers,
    changePackageOfPSLOnlyUsers: changePackageOfPSLOnlyUsers,
    usersCheckingScript: usersCheckingScript
}