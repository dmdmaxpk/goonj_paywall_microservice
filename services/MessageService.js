const container = require('../configurations/container');
const messageRepo = container.resolve("messageRepository");
const userRepo = container.resolve("userRepository");
const billinghistoryRepo = container.resolve("billingHistoryRepository");
const subscriberRepo = container.resolve("subscriberRepository");
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
    usersCheckingScript: usersCheckingScript
}