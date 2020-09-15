const mongoose = require('mongoose');
const BillingHistory = mongoose.model('BillingHistory');
const User = mongoose.model('User');
const Subscription = mongoose.model('Subscription');
const config = require('../config');

class BillingHistoryRepository {
    constructor(){
    }

    async createBillingHistory  (postData)  {
        let billingHistory = new BillingHistory(postData);
        let result = await billingHistory.save();
        return result;
    }
    
    async deleteMany  (user_id)  {
        const result = await BillingHistory.deleteMany({user_id: user_id});
        return result;
    }

    async deleteHistoryForSubscriber(subscriber_id)  {
        return await BillingHistory.remove({subscriber_id: subscriber_id});
    }
    
    async getUserForUnGray  (subscription_id)  {
        let dayToCompare = new Date();
        dayToCompare = dayToCompare.setHours(dayToCompare.getHours() - config.max_graylist_time_in_hrs);
        
        let records = await BillingHistory.findOne({subscription_id: subscription_id,
            $or: [{"billing_status": "unsubscribe-request-recieved"}, 
            {"billing_status": "unsubscribe-request-received-and-expired"}], 
            
            "billing_dtm": {$lte: dayToCompare}},
             null, {sort: {billing_dtm: -1}});
        return records;
    }

    async getBillingDataForSpecificSubscriberIds(subscriber_ids){
        let result = await BillingHistory.aggregate([
            { 
                $match:{ 
                    "subscriber_id": {$in : subscriber_ids},
                    $or: [{"billing_status": 'Success'}, {"billing_status": 'trial'}]
                }
            }
            ]);
        return result;
    }

    async getChargingDetails(input, from, to){
        console.log("getChargingDetails - ",input.length);
        let data = await BillingHistory.aggregate([
        {
        
            $match:{
                $and:[
                    {billing_dtm:{$gt: new Date(from)}}, 
                    {billing_dtm:{$lt: new Date(to)}},
                ],
                subscription_id: {$in: input},
                billing_status: "Success"
            }
        },{
            $group:{
                _id: {"day": {"$dayOfMonth" : "$billing_dtm"}, "month": { "$month" : "$billing_dtm" },
                            "year":{ $year: "$billing_dtm" }},
                count: {$sum: 1}	
            }
        },{
            $project:{
                _id: 0,
                date: {"$dateFromParts": { year: "$_id.year","month":"$_id.month","day":"$_id.day" }},
                count: "$count"
            }
        },{
            $sort:{
                date: 1	
            }
        }
        ]);

        return data;
    }
    
    async billingInLastHour  ()  {
        let todayOneHourAgo = new Date(); //step 1 
        todayOneHourAgo.setHours(todayOneHourAgo.getHours()-1);
        let billingCountInLastHour = await BillingHistory.find({"billing_dtm": {$gte: todayOneHourAgo},$or: [{billing_status:"Success"},{billing_status: "graced"}] }).count();
        return billingCountInLastHour;
    }
    
    async errorCountReportBySource ()  {
        console.time("errorCountReportBySource");
       let result = await Subscription.aggregate([ {
        $match:{
            added_dtm: {$gte: new Date("2020-06-10T00:00:00.000Z")}
        },
                $lookup:{
                           from: "billinghistories",
                           localField: "subscriber_id",
                           foreignField: "subscriber_id",
                           as: "histories"
                         }
            }, { 
                $project: { 
                            source: 1,
                            histories:  
                            { 
                                $filter: { 
                                input: "$histories",
                                as:"history",
                                cond: {
                                        $or: [ { $eq: ['$$history.billing_status',"graced"] } ] 
                                        } 
                                }
                            }
                        }
            }, {
                $unwind: "$histories" 
             }, {
                $group: { 
                            _id: {
                                    source: "$source", 
                                    errorMessage: "$histories.operator_response.errorMessage", 
                                    errorCode: "$histories.operator_response.errorCode" 
                                }, 
                            count: {$sum: 1} 
                        }
            }, {
                $project: { 
                            source: "$_id.source",
                            errorMessage: "$_id.errorMessage", 
                            errorCode: "$_id.errorCode",
                            count: "$count"  
                          } 
            }
            , {
                $sort: { "source": -1 }
            }
        ]);
        console.timeEnd("errorCountReportBySource");
        return result;
    }
    
    async errorCountReport  ()  {
        console.time("errorCountReport");
        let result = await Subscription.aggregate([ {
                $match:{
                    added_dtm: {$gte: new Date("2020-06-10T00:00:00.000Z")}
                },
                 $lookup:{
                            from: "billinghistories",
                            localField: "subscriber_id",
                            foreignField: "subscriber_id",
                            as: "histories"
                          }
             }, { 
                 $project: { 
                             source: 1,
                             histories:  
                             { 
                                 $filter: { 
                                 input: "$histories",
                                 as:"history",
                                 cond: {
                                         $or: [ { $eq: ['$$history.billing_status',"graced"] } ] 
                                         } 
                                 }
                             }
                         }
             }, {
                 $unwind: "$histories" 
              }, {
                 $group: { 
                             _id: {
                                     errorMessage: "$histories.operator_response.errorMessage", 
                                     errorCode: "$histories.operator_response.errorCode" 
                                 }, 
                             count: {$sum: 1} 
                         }
             }, {
                 $project: { 
                             errorMessage: "$_id.errorMessage", 
                             errorCode: "$_id.errorCode",
                             count: "$count"  
                           } 
             }
             , {
                 $sort: { count: -1 }
             }
         ]);
         console.timeEnd("errorCountReport");
         return result;
    }
    
    async dailyUnsubReport () {
        console.log("[dailyUnsubReport]");
        let result = await BillingHistory.aggregate([
            {
                $match:{
                    $or:[
                        {"billing_status": "expired"}, 
                        {"billing_status": "unsubscribe-request-received-and-expired"}
               ]
                }
            },{
                $group: {
                    _id: {"day": {"$dayOfMonth" : "$billing_dtm"}, "month": { "$month" : "$billing_dtm" },
                    "year":{ $year: "$billing_dtm" },source:"$source"},
                    count:{$sum: 1} 
                }
            },{ 
                $project: { 
                    date: {"$dateFromParts": { year: "$_id.year","month":"$_id.month","day":"$_id.day" }},
                    source: "$_id.source",
                    count:"$count"
                } 
            },
            { $sort: { date: -1} }
            ]);
            console.log("[dailyUnsubReport][reached]",result);
         return result;
    }

    async unsubReport (from, to) {
        console.log("=> Unsub from ", from, "to", to);
        let result = await BillingHistory.aggregate([
            {
                $match:{
                    $or:[
                                    {"billing_status": "expired"}, 
                                    {"billing_status": "unsubscribe-request-received-and-expired"}
                           ], $and: [
                                    {billing_dtm:{$gte:new Date(from)}},
                                    {billing_dtm:{$lte:new Date(to)}}
                           ]
                    }
            },{
                    $group: {
                                _id: {"day": {"$dayOfMonth" : "$billing_dtm"}, "month": { "$month" : "$billing_dtm" }, "year":{ $year: "$billing_dtm" }},
                        count: {$sum: 1}
                            }
            },{ 
                                 $project: { 
                                _id: 0,
                                date: {"$dateFromParts": { year: "$_id.year","month":"$_id.month","day":"$_id.day" }},
                        count: "$count"
                                 } 
                        },
                        { $sort: { date: 1} }
            ]);
        return result;
    }

    async numberOfTransactions (from, to) {
        console.log("=> numberOfTransactions from ", from, "to", to);
        let result = await BillingHistory.aggregate([
            {
                $match:{
                    "billing_status": "Success",
                    $and: [
                        {billing_dtm:{$gte:new Date(from)}}, 
                        {billing_dtm:{$lte:new Date(to)}}
                    ]
                }
            },{$count:"count"}
            ]);
        return result;
    }

    async totalUniqueTransactingUsers (from, to) {
        console.log("=> totalUniqueTransactingUsers from ", from, "to", to);
        let result = await BillingHistory.aggregate([
            {
                $match:{
                    "billing_status": "Success",
                    $and: [
                        {billing_dtm:{$gte:new Date(from)}}, 
                        {billing_dtm:{$lte:new Date(to)}}
                    ]
                    
                }
            },{
                $group:{
                    _id: "$user_id",
                    count: {$sum: 1}	
                }
            },{$count:"count"}
            ]);
        return result;
    }

    async dailyReturningUsers (from, to) {
        console.log("=> dailyReturningUsers from ", from, "to", to);
        let result = await BillingHistory.aggregate([
            {
                $match:{
                    micro_charge: false,
                    billing_status: "Success",
                    $and: [
                        {billing_dtm:{$gte:new Date(from)}},
                        {billing_dtm:{$lte:new Date(to)}}
                            ]
                    }
            },{
                $group: {
                    _id: "$user_id",
                    count: {$sum: 1}
                }
            }, {
                $match: {
                    "count":{
                        $gt: 1	
                    }
                }
            }, {
                $count: "totalcount"
            }
            ]);            
        return result;
    }
    
    async dailyChannelWiseUnsub ()  {
        let result = await BillingHistory.aggregate([
            {
                $match:{
                    $or:[{"billing_status" : "unsubscribe-request-recieved"}, {"billing_status" : "unsubscribe-request-received-and-expired"}],
                    "billing_dtm": {$gte:new Date("2020-06-10T00:00:00.000Z")},
                    "operator": "telenor"
                }
            },{
                $group:{
                    _id: {"user_id": "$user_id", "source": "$source", "day": {"$dayOfMonth" : "$billing_dtm"}, "month": { "$month" : "$billing_dtm" }, "year":{ $year: "$billing_dtm" }}
                }
            },{ 
                     $project: { 
                    _id: 0,
                    source: "$_id.source",
                    user_id: "$_id.user_id",
                            date: {"$dateFromParts": { year: "$_id.year","month":"$_id.month","day":"$_id.day" }}
                     } 
            },{
                $group:{
                    _id: {"date": "$date", "source": "$source"},
                    count: {$sum: 1}	
                }
            },{ 
                     $project: { 
                    _id: 0,
                            date: "$_id.date",
                    source: "$_id.source",
                    count: "$count"
                     } 
            },
            { $sort: { date: -1} }
            ]);
         return result;
    }
    
    async dailyChannelWiseTrialActivated () {
        let result = await BillingHistory.aggregate([
            {
                $match:{
                    billing_status: "trial",
                    "billing_dtm": {$gte:new Date("2020-04-01T00:00:00.000Z")}
                }
            },{
                $group: {
                        _id: {"source":"$source", "day": {"$dayOfMonth" : "$billing_dtm"}, "month": { "$month" : "$billing_dtm" },
                        "year":{ $year: "$billing_dtm" }},
                        count:{$sum: 1} 
                }
            },{ 
                $project: {
                _id: 0,
                source: "$_id.source",
                    date: {"$dateFromParts": { year: "$_id.year","month":"$_id.month","day":"$_id.day" }},
                    count:"$count" 
                } 
            },
            { $sort: { date: -1} }
            ]);
         return result;
    }
    
    async dailyExpiredBySystem ()  {
        let result = await BillingHistory.aggregate([
            {
                $match:{
                    "billing_status" : "expired",
            "billing_dtm": {$gte:new Date("2020-06-10T00:00:00.000Z")},
            "operator_response": {$exists: true}
                }
            },{
                $group: {
                    _id: {"user_id":"$user_id", "day": {"$dayOfMonth" : "$billing_dtm"}, "month": { "$month" : "$billing_dtm" },
                    "year":{ $year: "$billing_dtm" }},
                    count:{$sum: 1} 
                }
            },{ 
                $project: { 
                    date: {"$dateFromParts": { year: "$_id.year","month":"$_id.month","day":"$_id.day" }},
                    count:"$count" 
                } 
            },{ 
                $group: { 
                    _id: "$date",
                    count:{$sum: 1} 
                } 
            },{ 
                $project: {
            _id: 0, 
                    date: "$_id",
                    count:"$count" 
                } 
            },
            { $sort: { date: -1} }
            ]);
         return result;
    }
    
    async dailyNonTelenorUsers ()  {
        let result = await BillingHistory.aggregate([         {             
            $match:{ 
                $or:[{"billing_status" : "unsubscribe-request-recieved"}, {"billing_status" : "unsubscribe-request-received-and-expired"}],                 
            "billing_dtm": {$gte:new Date("2020-03-25T00:00:00.000Z")}, 
            "operator": "not_telenor"             
        }         },
        {             $group: {                     _id: {"day": {"$dayOfMonth" : "$billing_dtm"}, "month": { "$month" : "$billing_dtm" },                     "year":{ $year: "$billing_dtm" }},                     count:{$sum: 1}              }         },{              $project: {             _id: 0,             date: {"$dateFromParts": { year: "$_id.year","month":"$_id.month","day":"$_id.day" }},              count:"$count"              }          },         { $sort: { date: -1} }         ]);
         return result;
    }

    async getExpiryHistory(user_id) {
        let result = await BillingHistory.aggregate([{             
            $match:{ 
                "user_id": user_id,
                $or:[
                    {"billing_status" : "expired"}, 
                    {"billing_status" : "unsubscribe-request-recieved"}, 
                    {"billing_status" : "unsubscribe-request-received-and-expired"}
                ]
            }      
        }]);
        return result;
    }

    async getExpiredBase (user_id) {
        let result = await BillingHistory.aggregate([{             
            $match:{ 
                $or:[
                    {"billing_status" : "expired"}, 
                    {"billing_status" : "unsubscribe-request-recieved"}, 
                    {"billing_status" : "unsubscribe-request-received-and-expired"}
                ]
            }      
        }]);
        return result;
    }
    
    async getDailyFullyChargedAndPartialChargedUsers ()  {
        let result = await BillingHistory.aggregate([{
            $match: {
                "billing_status": "Success",
                "billing_dtm": {$gte: new Date("2020-06-10T00:00:00.000Z")}
            }
        },{
            $group: {
                _id: {"day": {"$dayOfMonth" : "$billing_dtm"}, "month": { "$month" : "$billing_dtm" },"year":{ $year: "$billing_dtm"}, "micro_charge_state": "$micro_charge"}, 
                count:{ $sum: 1 } 
            } 
        },{
            $project: {
                _id: 0,
                micro_charge_state: "$_id.micro_charge_state",
                        date: {"$dateFromParts": { year: "$_id.year","month":"$_id.month","day":"$_id.day" }},
                        total: "$count"
            }
        },{ 
            $sort: { 
                date: -1
            } 
        }]);
         return result;
    }

    async getTodaysRevenue (today)  {
        console.log("=>", today);
        try{
            let result = await BillingHistory.aggregate([ { $match: { 
                "billing_status": "Success",
                "billing_dtm":{$gt: new Date(today)}
                } },
                { $project: { _id: 0, "price": "$price" } },{ $group: {          _id: null,          total: {              $sum: "$price"          }      }  } ]);
                console.log("=> ", result);
             return result;
        }catch(err){
            console.log("=>", err);
        }
    }

    async getRevenueInDateRange (from, to)  {
        try{
            let result = await BillingHistory.aggregate([ { $match: { 
                "billing_status": "Success",
                $and:[
                    {"billing_dtm":{$gt: new Date(from)}}, 
                    {"billing_dtm":{$lte: new Date(to)}}
                ]            
                } },
                { $project: { _id: 0, "price": "$price" } },{ $group: {          _id: null,          total: {              $sum: "$price"          }      }  } ]);
                console.log("=> ", result);
             return result;
        }catch(err){
            console.log("=>", err);
        }
    }

    async getRequests(from, to)  {
        try{
            let result = await BillingHistory.aggregate([
            {
                $match:{
                $or:[
                    {billing_status: "Success"}, 
                    {billing_status: "graced"}
                ],
                $and:[
                    {billing_dtm:{$gt: new Date(from)}}, 
                    {billing_dtm:{$lte: new Date(to)}}
                ]
                }
            },{
                $count: "sum"
            }
            ]);

            console.log("=> ", result);
             return result;
        }catch(err){
            console.log("=>", err);
        }
    }

    async getUsersNotSubscribedAfterSubscribe()  {
        console.log("=> executing query");
        try{
            let result = await BillingHistory.aggregate([
                {
                    $match:{
                        "billing_status": "Success",
                        $and:[
                            {billing_dtm:{$gte:new Date("2020-07-01T00:00:00.000Z")}},
                            {billing_dtm:{$lt:new Date("2020-07-31T00:00:00.000Z")}}
                        ]
                        }
                },{
                    $group: {
                        _id: "$user_id"
                    }
                },{
                    $lookup:{
                        from: "billinghistories",
                        let: {user_id: "$_id" },
                        pipeline:[
                            {
                                $match: {
                                        $expr: {
                                                $and:[
                                                    {$eq: ["$user_id", "$$user_id"]},
                                                    {$ne: ["$billing_status", "Success"]},
                
                {$and: [
                        {$gte: ["$billing_dtm", new Date("2020-08-01T00:00:00.000Z")]},
                        {$lte: ["$billing_dtm", new Date("2020-08-30T00:00:00.000Z")]}
                    ]
                }
                                                ]
                                        }
                                }
                            }
                        ],
                        as: 'billing_activities'	
                    }
                },{
                    $project:{
                        _id: 1,
                        isAnyTrue: { $anyElementTrue: [ "$billing_activities" ] }	
                    }
                },{
                    $match:{
                        "isAnyTrue": true	
                    }
                },{
                    $lookup:{
                        from: "users",
                        localField: "_id",
                        foreignField: "_id",
                        as: "usersdata"
                    }
                },{
                    $unwind: "$usersdata"
                },{
                    $project: {
                        msisdn: "$usersdata.msisdn"
                    }
                }
            ]);

            console.log("=> ", result);
            return result;
        }catch(err){
            console.log("=>", err);
        }
    }
}





module.exports = BillingHistoryRepository;