const mongoose = require('mongoose');
const Subscriber = mongoose.model('Subscriber');

const moment = require("moment");

class SubscriberRepository {
    constructor({}) {

    }

    async createSubscriber (postData) {
        let subscriber = new Subscriber(postData);
        let result = await subscriber.save();
        return result;
    }
    
    async getSubscriber(id)  {
        let result = await Subscriber.findOne({_id: id});
        return result;
    }

    async getAllSubscribers(limit, skip)  {
        let result = await Subscriber.find().limit(limit).skip(skip);
        return result;
    }

    async getCount()  {
        return await Subscriber.countDocuments({});
    }
    
    async getSubscriberByUserId (user_id) {
        let result = await Subscriber.findOne({user_id: user_id});
        return result;
    }
    
    async getRenewableSubscribers () {
        let results = await Subscriber.find({is_billable_in_this_cycle: true}).limit(4000);
        return results;
    }
    
    async getBilledSubscribers ()  {
        let results = await Subscriber.find(
            {$or:[{subscription_status:'billed'}], 
            next_billing_timestamp: {$lte: new Date()}, active: true});
        return results;
    }
    
    
    async updateSubscriber (user_id, postData)  {
        const query = { user_id: user_id };
        postData.last_modified = new Date();
        try {
            const result = await Subscriber.updateOne(query, postData);
            if (result.nModified === 0) {
                return undefined;
            } else {
                let subscriber = await getSubscriber(user_id);
                return subscriber;
            }
        } catch(error) {
            console.log(error);
            return error;
        }
    }
    
    async deleteSubscriber  (user_id) {
        const result = await Subscriber.deleteOne({user_id: user_id});
        return result;
    }
    
    async resetAmountBilledToday  () {
        const result = await Subscriber.updateMany({},{$set: { amount_billed_today : 0}});
        return result;
    }
    
    async setSubcriberInactive (user_id)  {
        if (user_id) { 
            const query = { user_id: user_id };
            const result = await Subscriber.updateOne(query,{ $set: { active: false } });
            if (result.nModified === 0) {
                return undefined;
            }else{
                let subscriber = await getSubscriber(user_id);
                return subscriber;
            }
        } else {
             return undefined;
        }
    }
    
    async unsubscribe (user_id) {
        if (user_id) { 
            const query = { user_id: user_id };
            const result = await Subscriber.updateOne(query,{ $set: { auto_renewal: false,subscription_status: 'expired' } });
            if (result.nModified === 0) {
                return undefined;
            }else{
                let subscriber = await getSubscriber(user_id);
                return subscriber;
            }
        } else {
             return undefined;
        }
    }
    
    // async removeNumberAndHistory (msisdn)  {
    
    //     let user = await this.userRepo.getUserByMsisdn(msisdn);
    //     if (user) { 
    //         let userId = user._id;
    //         await this.userRepo.deleteUser(userId);
    //         await deleteSubscriber(userId);
    //         await this.istoryRepo.deleteMany(userId);
    //         console.log(`The MSISDN ${msisdn} records deleted successfully`);
    //     } else {
    //         console.log(`The MSISDN ${msisdn} failed to delete records`);
    //     }
    // }
    
    async getSubscribersToMark ()  {
        let now = moment();
        let endOfDay = now.endOf('day').tz("Asia/Karachi");
        console.log("endOfDay",endOfDay);
        let results = await Subscriber.find(
            {$or:[{subscription_status:'billed'},{subscription_status:'graced'},{subscription_status:'trial'}], 
            next_billing_timestamp: {$lte: endOfDay}, active: true}).select('user_id');
        let user_ids = results.map(user_id => {
            return user_id.user_id;
        });
        return user_ids;
    }
    
    async setAsBillableInNextCycle (user_ids)  {
        let result = await Subscriber.updateMany({user_id: {$in :user_ids}},{$set:{is_billable_in_this_cycle: true}});
    }

    async removeByUserIds(userIds=[]){
        if (userIds.length > 0) {
            try {
                await Subscriber.remove({user_id: {$in: userIds}});
                // userIds.forEach( async (userId) => {
                //     await Subscriber.remove({user_id:  userId}});
                //     console.log(`Subscriber with user Id ${userId} removed from db`);
                // });
                return true;
            } catch (err) {
                throw err;
            }
        } else {
            return null;
        }
    }
}

module.exports = SubscriberRepository;