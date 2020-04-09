const mongoose = require('mongoose');
const BillingHistory = mongoose.model('BillingHistory');
const User = mongoose.model('User');
const config = require('../config');

createBillingHistory = async(postData) => {
    let billingHistory = new BillingHistory(postData);
    let result = await billingHistory.save();
    return result;
}

deleteMany = async(user_id) => {
    const result = await BillingHistory.deleteMany({user_id: user_id});
    return result;
}

getUserForUnGray = async(user_id) => {
    let dayToCompare = new Date();
    dayToCompare = dayToCompare.setHours(dayToCompare.getHours() - config.max_graylist_time_in_hrs);
    
    let records = await BillingHistory.findOne({user_id: user_id, "billing_status": "unsubscribe-request-recieved", "billing_dtm": {$lte: dayToCompare}}, null, {sort: {billing_dtm: -1}});
    return records;
}

billingInLastHour = async() => {
    let todayOneHourAgo = new Date(); //step 1 
    todayOneHourAgo.setHours(todayOneHourAgo.getHours()-1);
    let billingCountInLastHour = await BillingHistory.find({"billing_dtm": {$gte: todayOneHourAgo},$or: [{billing_status:"Success"},{billing_status: "graced"}] }).count();
    return billingCountInLastHour;
}

errorCountReportBySource = async() => {
    console.time("errorCountReportBySource");
   let result = await User.aggregate([ {
            $lookup:{
                       from: "billinghistories",
                       localField: "_id",
                       foreignField: "user_id",
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

errorCountReport = async() => {
    console.time("errorCountReport");
    let result = await User.aggregate([ {
             $lookup:{
                        from: "billinghistories",
                        localField: "_id",
                        foreignField: "user_id",
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

dailyUnsubReport = async() => {
    let result = await BillingHistory.aggregate([
        {
            $match:{
                "billing_status" : "expired"
            }
        },{
            $group: {
                _id: {"day": {"$dayOfMonth" : "$billing_dtm"}, "month": { "$month" : "$billing_dtm" },
                "year":{ $year: "$billing_dtm" }},
                count:{$sum: 1} 
            }
        },{ 
            $project: { 
                date: {"$dateFromParts": { year: "$_id.year","month":"$_id.month","day":"$_id.day" }},
                count:"$count" 
            } 
        },
        { $sort: { date: -1} }
        ]);
     return result;
}

dailyChannelWiseUnsub = async() => {
    let result = await BillingHistory.aggregate([
        {
            $match:{
                "billing_status" : "unsubscribe-request-recieved",
                "billing_dtm": {$gte:new Date("2020-03-25T00:00:00.000Z")}
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

dailyExpiredBySystem = async() => {
    let result = await BillingHistory.aggregate([
        {
            $match:{
                "billing_status" : "expired",
		"billing_dtm": {$gte:new Date("2020-03-25T00:00:00.000Z")},
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

getDailyFullyChargedAndPartialChargedUsers = async() => {
    let result = await BillingHistory.aggregate([{
        $match: {
            "billing_status": "Success",
            "billing_dtm": {$gte: new Date("2020-03-14T00:00:00.000Z")}
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



module.exports = {
    createBillingHistory: createBillingHistory,
    deleteMany: deleteMany,
    getUserForUnGray: getUserForUnGray,
    billingInLastHour: billingInLastHour,
    errorCountReportBySource: errorCountReportBySource,
    errorCountReport: errorCountReport,
    dailyUnsubReport: dailyUnsubReport,
    dailyChannelWiseUnsub: dailyChannelWiseUnsub,
    dailyExpiredBySystem: dailyExpiredBySystem,
    getDailyFullyChargedAndPartialChargedUsers: getDailyFullyChargedAndPartialChargedUsers
}