const mongoose = require('mongoose');
var MongoClient = require('mongodb').MongoClient;
const config = require('../config');

let connect = async () => {
    return new Promise(async (resolve, reject) => {
        await MongoClient.connect('mongodb://10.0.1.70:27017/streamlogs',  async function (err, client) {
            if(err){
                console.error(`Database Access Denied : ${err.message}`);
                reject();
            }else{
                let dbConn = await client.db('streamlogs');
                resolve(dbConn);
            }
        });
    });
};

let computeData = async (msisdn, startDate, endDate, dbConnection) => {
    return new Promise((resolve, reject) => {
        let match = { $and:[{logDate:{$gte:new Date(startDate)}}, {logDate:{$lte:new Date(endDate)}}] };
        match.msisdn = msisdn;
        dbConnection.collection('msisdnstreamlogs', function (err, collection) {
            if (err) {
                console.log('err: ', err);
                resolve([]);
            }

            collection.aggregate([
                { $match: match},
                { $project: {
                        bitrate: "$bitrateCount",
                        logMonth: { $month: "$logDate" },
                    }
                },
                { $group: {
                        _id: {logMonth: "$logMonth"},
                        totalBitRates: { $sum: "$bitrate" }
                    }
                }
            ],{ allowDiskUse: true }).toArray(function(err, items) {
                if(err){
                    console.log('computeData - err: ', err.message);
                    resolve([]);
                }
                resolve(items);
            });

        });
    });
};

module.exports = {
    connect: connect,
    computeData: computeData,
}