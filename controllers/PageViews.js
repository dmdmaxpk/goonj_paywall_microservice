var MongoClient = require('mongodb').MongoClient;

connect = async() => {
    MongoClient.connect("mongodb://localhost:27017/", (err, client) => {
        db = client.db('logger');
        return db;
    });
}

getPageViews = async(db) => {
    db.collection('logs', function (err, collection) {
        collection.aggregate([
            {
                $match:{
                    method:'pageview', 
                    source:'HE'
                }
            },{
                $group:{
                    _id: {msisdn: "$req_body.msisdn", "day": {"$dayOfMonth" : "$added_dtm"}, "month": { "$month" : "$added_dtm" }, "year":{ $year: "$added_dtm" }},
                    count: {$sum: 1}	
                }
            },{
                $project: { 
                            _id: 0,
                            date: {"$dateFromParts": { year: "$_id.year","month":"$_id.month","day":"$_id.day" }},
                    count: "$count"
                    } 
            },{
                $group:{
                    _id: "$date",
                    count:{$sum:1}	
                }
            }
            
            ,{$sort: {_id: -1}}
            ]).toArray(function(err, items) {
                if(err){
                    console.log(err);
                    return;
                }
                return items;         
            });;
    });
}

module.exports = {
    connect: connect,
    getPageViews: getPageViews
}