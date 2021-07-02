const mongoose = require('mongoose');
const BillingHistory = mongoose.model('BillingHistory');
const User = mongoose.model('User');
const Subscription = mongoose.model('Subscription');
const config = require('../config');
const helper = require('../helper/helper');
const  _ = require('lodash');

class BillingHistoryRepository {
    constructor(){
    }

    async createBillingHistory  (postData)  {
        // Success billing
        let serverDate = new Date();
        let localDate = helper.setDateWithTimezone(serverDate);

        let billingHistory = new BillingHistory(postData);
        billingHistory.billing_dtm = _.clone(localDate);
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
        console.log("=> billinghistory - getChargingDetails - ",input.length);
        let data = await BillingHistory.aggregate([
        {
        
            $match:{
                $and:[
                    {billing_dtm:{$gt: new Date(from)}}, 
                    {billing_dtm:{$lt: new Date(to)}},
                ],
                subscriber_id: {$in: input},
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

    async getBillingStats(from, to){
        console.log("=> getBillingStats - ", from, " - to - ", to);
        let data = await BillingHistory.aggregate([
            {
                $match:{
                    $or:[
                        {"billing_status": "Success"}, 
                        {"operator_response.errorMessage": "The account balance is insufficient."}	
                    ],
                    $and:[
                        {billing_dtm:{$gt: new Date(from)}}, 
                        {billing_dtm:{$lt: new Date(to)}}
                    ]
                }
            },{
                $project:{
                    "billing_status": "$operator_response.errorMessage"	
                }
            },{
                $group:{
                    _id: "$billing_status",
                    count: {$sum:1}
                }
            }]);
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

    async numberOfTransactionsOfSpecificSubscriber(subscriber_id, from, to) {
        let result = await BillingHistory.aggregate([
            {
                $match:{
                    "subscriber_id": subscriber_id,
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

    async getBillingStatsStatusWseInDateRange (from, to)  {
        try{
            let result = await BillingHistory.aggregate([
                { $match: {
                        $and:[
                            {"billing_dtm":{$gt: new Date(from)}},
                            {"billing_dtm":{$lte: new Date(to)}}
                        ]
                    }},
                { $group: {
                        _id: "$billing_status", total: { $sum: 1 }
                    }}
            ]);
            return result;
        }catch(err){
            console.log("getBillingStatsStatusWseInDateRange - err =>", err);
        }
    }

    async getBillingInsufficientBalanceInDateRange (from, to)  {
        try{
            let result = await BillingHistory.aggregate([
                { $match: {
                        "operator_response.errorMessage": "The account balance is insufficient.",
                        $and:[
                            {"billing_dtm":{$gt: new Date(from)}},
                            {"billing_dtm":{$lte: new Date(to)}}
                        ]
                    }},
                { $group: {
                        _id: null, total: { $sum: 1 }
                    }}
            ]);
            return result;
        }catch(err){
            console.log("getBillingInsufficientBalanceInDateRange - err =>", err);
        }
    }

    async getBillingRequestCountInDateRange (from, to)  {
        try{
            let result = await BillingHistory.aggregate([
                { $match: {
                        $or:[
                            {billing_status: "Success"},
                            {billing_status: "graced"}
                        ],
                        $and:[
                            {"billing_dtm":{$gt: new Date(from)}},
                            {"billing_dtm":{$lte: new Date(to)}}
                        ]
                    }},
                { $group: {
                        _id: null, total: { $sum: 1 }
                    }}
            ]);
            return result;
        }catch(err){
            console.log("getBillingRequestCountInDateRange - err =>", err);
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

    async getLastSixtyDaysChargedUsers(from, to)  {
        console.log("=> getLastSixtyDaysChargedUsers");
        try{
            let result = await BillingHistory.aggregate([
            {
                $match:{
                    billing_status: "Success",
                    $and:[
                        {billing_dtm:{$gt: new Date(from)}}, 
                        {billing_dtm:{$lt: new Date(to)}}
                    ]	
                }
            },
            {$limit: 20},
            {
                $group:{
                    _id: "$user_id"	
                }
            }]);
            
            return result;
        }catch(err){
            console.log("=>", err);
        }
    }
    async getSuccessfullChargedUsers(mPackage)  {
        try{
            if(mPackage === 'QDfC'){
                let result = await BillingHistory.find({package_id:mPackage,billing_status: 'Success', $and:[{billing_dtm:{$gte:new Date("2021-03-22T00:00:00.000Z")}},{billing_dtm:{$lte:new Date("2021-03-23T00:00:00.000Z")}}]});
                return result;
            }else{
                let result = await BillingHistory.find({package_id:mPackage,billing_status: 'Success', $and:[{billing_dtm:{$gte:new Date("2021-03-16T00:00:00.000Z")}},{billing_dtm:{$lte:new Date("2021-03-17T00:00:00.000Z")}}]});
                return result;
            }
        }catch(err){
            console.log("=>", err);
        }
    }

    async getUnsuccessfullChargedUsers(id, mPackage)  {
        try{
            let result = await BillingHistory.findOne({user_id: id, package_id: mPackage, billing_status: 'Success', $and: [{billing_dtm:{$gte:new Date("2021-03-23T00:00:00.000Z")}},{billing_dtm:{$lte:new Date("2021-03-24T00:00:00.000Z")}}]});
            return result;
        }catch(err){
            console.log("###", err);
        }
    }

    async getMigratedUsers(from, to)  {
        try{
            let result = await BillingHistory.aggregate([
                {
                    $match:{
                        'operator_response.errorMessage': "The subscriber does not exist or the customer that the subscriber belongs to is being migrated. Please check.",
                        $and:[
                            {billing_dtm:{$gt: new Date(from)}},
                            {billing_dtm:{$lt: new Date(to)}}
                        ]
                    }
                },
                { $group:{ _id: "$user_id" }}
            ]);

            return result;
        }catch(err){
            console.log("###", err);
        }
    }

    async getLastHistory(user_id, mPackage)  {
        try{
            let result = await BillingHistory.find({user_id: user_id, package_id: mPackage, $and: [{billing_dtm:{$gte:new Date("2021-03-23T00:00:00.000Z")}},{billing_dtm:{$lte:new Date("2021-03-24T00:00:00.000Z")}}]}).sort({billing_dtm:-1}).limit(1);
            return result;
        }catch(err){
            console.log("###", err);
        }
    }

    async getSuccessfulChargedUsers(startDate, endDate)  {
        console.log('getSuccessfulChargedUsers: ', startDate, endDate);

        try{
            let result = await BillingHistory.aggregate([
                    { $match:{
                            billing_status: "Success",
                            $and:[{billing_dtm:{$gte:new Date(startDate)}}, {billing_dtm:{$lte:new Date(endDate)}}]
                        }},
                    { $project: {
                            "user_id": "$user_id"
                    }},
                    {$group: {
                        _id: { user_id: "$user_id"}
                    }},
                    { $project: {
                        "user_id": "$_id.user_id"
                    }},
                ]);
            return result;
        }catch(err){
            console.log("###", err);
        }
    }
}





module.exports = BillingHistoryRepository;