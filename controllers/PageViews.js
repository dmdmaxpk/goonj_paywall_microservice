var MongoClient = require('mongodb').MongoClient;

connect = async() => {
    return new Promise((resolve, reject) => {
        MongoClient.connect("mongodb://localhost:27017/", function(err, client) {
            if(err){
                reject(err);
            }else{
                db = client.db('logger');
                resolve(db);
            }
        });
    });
}

getPageViews = async(db) => {
    return new Promise((resolve, reject) => {
        db.collection('logs', function (err, collection) {
            collection.aggregate([
                {
                    $match:{
                        method:'pageview'
                    }
                },{
                    $group:{
                        _id: {msisdn: "$req_body.msisdn", "day": {"$dayOfMonth" : "$added_dtm"}, 
                                "month": { "$month" : "$added_dtm" }, "year":{ $year: "$added_dtm" },"source": "$source","mid": "$req_body.mid"},
                        count: {$sum: 1}	
                    }
                },{
                    $project: { 
                        _id: 0,
                        date: {"$dateFromParts": { year: "$_id.year","month":"$_id.month","day":"$_id.day" }},
                        count: "$count",
                        source: "$_id.source",
                        mid: "$_id.mid"
                        } 
                },{
                    $group:{
                        _id: {date: "$date",source: "$source",mid: "$mid"},
                        count:{$sum:1}	
                    }
                }, {
                    $project:{
			_id: 0,
                        date: "$_id.date",
                        source: "$_id.source",
                        mid: "$_id.mid",
                        count:"$count"	
                    }
                }
                ,{$sort: {date: -1}}
                ], { allowDiskUse: true }).toArray(function(err, items) {
                    if(err){
                        reject(err);
                    }
                    resolve(items);      
                });
        });
    });
}

getHeLogs = async(key, from, to) => {
    return new Promise((resolve, reject) => {
        db.collection('helogs', async (err, collection) => {
            let count = await collection.countDocuments({added_dtm : {$gte: new Date(from),$lt: new Date(to) }, "mid":key});
            resolve(count);
        });
    });
}

module.exports = {
    connect: connect,
    getPageViews: getPageViews,
    getHeLogs: getHeLogs
}