const mongoose = require('mongoose');
const User = mongoose.model('User');
const DuplicateMsisdn = mongoose.model('DuplicateMsisdn');
const QueueRepo = require("./QueueRepo");

class UserRepository {
    constructor({subscriberRepository,subscriptionRepository}){
        this.subscriberRepo = subscriberRepository;
        this.subscriptionRepo = subscriptionRepository;
    }

    async createUser (postData)  {
        let user = new User(postData);
        let result = await user.save();
        return result;
    }

    async getGraylistUsers () {
        let results = await User.find({merketing_source: {$ne: 'none'}, subscription_status: 'expired', is_gray_listed: true});
        return results;
    }

    async getPslPackageUsers () {
        let results = await User.find({subscribed_package_id : {$in: ["QDfE"]} }).limit(5000);
        return results;
    }

    async getPslOnlyPackageUsers () {
        let results = await User.find({subscribed_package_id : {$in: ["QDfD"]} }).limit(5000);
        return results;
    }

    async getUserByMsisdn (msisdn) {
        let result = await User.findOne({msisdn: msisdn});
        return result;
    }

    async getUserBySubscriptionId (subscription_id)  {
        let subscription = await this.subscriptionRepo.getSubscription(subscription_id);
        let subscriber = await this.subscriberRepo.getSubscriber(subscription.subscriber_id);
        let user = this.getUserById(subscriber.user_id);
        return user;
    }

    async getUserById  (id)  {
        let result = await User.findOne({_id: id});
        return result;
    }

    async updateUser (msisdn, postData)  {
        const query = { msisdn: msisdn };
        postData.last_modified = new Date();
        const result = await User.updateOne(query, postData);
        if (result.nModified === 0) {
            return undefined;
        }else{
            let user = await this.getUserByMsisdn(msisdn);
            return user;
        }
    }

    async updateMany(ids)  {
        let data = await User.updateMany({"_id": {$in:ids }},{$set:{should_remove: true}});
        return data;
    }

    async updateUserById (user_id, postData)  {
        const query = { _id: user_id };
        postData.last_modified = new Date();
        const result = await User.updateOne(query, postData);
        if (result.nModified === 0) {
            return undefined;
        }else{
            let user = await getUserById(user_id);
            return user;
        }
    }

    async deleteUser (user_id)  {
        const result = await User.deleteOne({_id: user_id});
        return result;
    }

    async getTotalUserBaseTillDate (from, to) {
        const result = await User.find(
        {
            $or:[{"subscription_status" : "billed"}, {"subscription_status" : "graced"}, {"subscription_status" : "trial"}], 
            operator:"telenor", 
            subscribed_package_id: {$ne: "none"},
            $and:[{added_dtm:{$gte:new Date(from)}}, {added_dtm:{$lte:new Date(to)}}]
        }, 
            {msisdn:1});
        return result;
    }

    async getActiveUsers (from, to)  {
        const result = await User.find({operator:"telenor", $and:[{added_dtm:{$gte:new Date(from)}}, {added_dtm:{$lte:new Date(to)}}]}, {msisdn:1});
        return result;
    }

    async getExpiredBase (from, to)  {
        const result = await User.find(
            {
                "subscription_status" : "expired", 
                operator:"telenor",
                $and:[{added_dtm:{$gte:new Date(from)}}, {added_dtm:{$lte:new Date(to)}}]
            }, {msisdn:1});
        return result;
    }

    async gdnTrial () {
        try {
            let promise = User.aggregate([
                { $match: { added_dtm: {$gte:  new Date("2020-05-21T00:00:00.072Z")}, affiliate_mid: "gdn"}},
                {$group: {_id: {"day": {"$dayOfMonth" : "$added_dtm" }, "month": { "$month" : "$added_dtm" },
                            "year":{ $year: "$added_dtm" },msisdn:"$msisdn" }, count:{ $sum: 1 } }   },
                {$group: {_id: {"day": "$_id.day", "month": "$_id.month","year": "$_id.year" } , count:{ $sum: 1 } } },
                {$project: { _id: 0,date: { $dateFromParts: { year: "$_id.year","month":"$_id.month","day":"$_id.day" }}, count:"$count" }   },
                {$project: { count:"$count",dateFormat: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }}}
            ]);
            let result = await promise;
            return result;
        } catch(err) {
            throw err;
            console.error(err);
        }
    }

    async gdnPaidUsers ()  {
        try {
            let promise = User.aggregate([
                {$match: {affiliate_mid: "gdn",added_dtm: {$gte:  new  Date("2020-05-21T00:00:00.072Z")}}},
                {$lookup:{from: "billinghistories",localField: "_id",foreignField: "user_id",as: "histories"}},
                { $project: {added_dtm:"$added_dtm", succeses: { $filter: {
                    input: "$histories",
                    as: "history",
                    cond: { 
                       $eq: [ "$$history.billing_status", "Success" ] 
                   }}} }},
                   {$project: { added_dtm:"$added_dtm", numOfSucc: { $size:"$succeses" } }},
                   {$match: { numOfSucc: {$gte: 1}  }},
                   {$group: { _id: {"day": {"$dayOfMonth" : "$added_dtm" }, "month": { "$month" : "$added_dtm" },"year":{ $year: "$added_dtm" } },
                            count:{$sum: 1} }},{$project: { _id: 0,date: { $dateFromParts: { year: "$_id.year","month":"$_id.month","day":"$_id.day" }}, count:"$count" }   },
                    {$project: { count:"$count",dateFormat: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }}}
            ]);
            let result = await promise;
            return result;
        } catch(err) {
            throw err;
            console.error(err);
        }
    }

    async getMoreThanOneMsisdns(){
        console.log("=> getMoreThanOneMsisdns")
        let users = await DuplicateMsisdn.aggregate([
            {
                $lookup: {
                    from: "users",
                            let: { msisdn: "$_id" },
                    pipeline: [ 
                    {
                        $match:{
                            $expr:{
                                $eq:["$$msisdn","$msisdn"]
                            }
                        }
                    }
                    ],
                            as: "dupsUsers"
                    }
            }
            ]);

        return users;
    }

    // async getDuplicatedMsisdnUsers(){
    //     let users = await User.aggregate([{
    //         $group: {
    //           _id: "$msisdn",count:{$sum: 1}
    //         }
    //       }, {
    //         $match:{count:{$gte: 2}}
    //       },
    //         {
    //                 $lookup:  {
    //                     from: "users",
    //                     let: { msisdn: "$_id" },
    //                     pipeline: [ {$match: { $expr: {$and: [ { $eq : ["$msisdn", "$$msisdn"] }  ] }  }},{"$sort":{added_dtm: -1}} ],
    //                     as: "users"
    //                 }
    //             },
    //             {
    //                 $project: {
    //                     user_ids_to_remove: { $slice: [ "$users", 1 ] }
    //                 }
    //             },
    //             {
    //                 $unwind: "$user_ids_to_remove"
    //             }, {
    //                 $project: {
    //                   user_id: "$user_ids_to_remove._id"
    //                 }
    //             },{
    //                 /**
    //                  * _id: The id of the group.
    //                  * fieldN: The first field name.
    //                  */
    //                 $group: {
    //                   _id: null,
    //                   count: {
    //                     $sum: 1
    //                   },
    //                 ids : { "$addToSet" : "$user_id" } 
    //                 }
    //             }
    //     ]);
    //     return users;
    // }

    async removeByIds(Ids=[]){
        if (Ids.length > 0) {
            try {
                await User.remove({_id: {$in:Ids}});
                // Ids.forEach( async (id) => {
                //     await User.remove({_id: id});
                //     console.log(`user with id ${id} removed`);
                // })
                return true;
            } catch (err) {
                throw err;
            }
        } else {
            return null;
        }
    }

    async getData(mobileNumber){
        let record = await User.aggregate([ { $match:{ msisdn: mobileNumber } },{ $lookup:{ from: "subscribers", localField: "_id", foreignField: "user_id", as: "subscriber" } },{ $project:{ _id: 0, user_id: "$_id", msisdn: "$msisdn", subscriber_id: {     $let: {        vars: {           singleSub: { $arrayElemAt: [ '$subscriber', 0 ] },        },        in: "$$singleSub._id"     } } } },{ $lookup:{ from: "subscriptions", let: {subscriber_id: "$subscriber_id"}, pipeline:[ {"$match":{"$expr":{"$eq":["$$subscriber_id", "$subscriber_id"]}}}, {$sort: {"added_dtm": 1}} ], as: "subs" } },{ $project:{ "msisdn": 1, "user_id": 1, "subscriber_id": 1, "subscription_counts": { $size: "$subs" }, "acquisition_date": {     $let: {        vars: {           singleSub: { $arrayElemAt: [ '$subs', 0 ] }        },        in: "$$singleSub.added_dtm"     } }, "subscription_status": {     $let: {        vars: {           singleSub: { $arrayElemAt: [ '$subs', 0 ] }        },        in: "$$singleSub.subscription_status"     } }, "acquisition_mid": {     $let: {        vars: {           singleSub: { $arrayElemAt: [ '$subs', 0 ] }        },        in: "$$singleSub.mid"     } }, "acquisition_source": {     $let: {        vars: {           singleSub: { $arrayElemAt: [ '$subs', 0 ] }        },        in: "$$singleSub.source"     } }, "total_successful_chargings": {     $let: {        vars: {      firstSub: { $arrayElemAt: [ '$subs', 0 ] },   secondSub: {$cond: { if: { $gte: [ "$subscription_counts", 2 ] }, then: { $arrayElemAt: [ '$subs', 1 ] }, else: {total_successive_bill_counts:0} }} },        in: { $add: [ "$$firstSub.total_successive_bill_counts", "$$secondSub.total_successive_bill_counts"] } } } } } ]);
        return record;
    }
}

module.exports = UserRepository;





























