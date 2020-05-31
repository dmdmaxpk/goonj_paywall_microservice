const mongoose = require('mongoose');
const Subscription = mongoose.model('Subscription');
const moment = require("moment");

class SubscriptionRepository {
    constructor({}){
    }

    async createSubscription (postData)  {
        let subscription = new Subscription(postData);
        let result = await subscription.save();
        return result;
    }
    
    async getSubscription (subscription_id)  {
        result = await Subscription.findOne({_id: subscription_id});
        return result;
    }
    
    async getAllSubscriptions (subscriber_id)  {
        result = await Subscription.find({subscriber_id: subscriber_id});
        return result;
    }
    
    async getRenewableSubscriptions  ()  {
        let results = await Subscription.find({is_billable_in_this_cycle: true}).limit(4000);
        return results;
    }
    
    async getBilledSubscriptions ()  {
        let results = await Subscription.find(
            {$or:[{subscription_status:'billed'}], 
            next_billing_timestamp: {$lte: new Date()}, active: true});
        return results;
    }
    
    async updateSubscription (subscription_id, postData)  {
        const query = { _id: subscription_id };
        postData.last_modified = new Date();
    
        try {
            const result = await Subscription.updateOne(query, postData);
            if (result.nModified === 0) {
                return undefined;
            } else {
                let subscription = await getSubscription(subscription_id);
                return subscription;
            }
        } catch(error) {
            console.log(error);
            return error;
        }
    }
    
    async deleteSubscription  (subscription_id)  {
        const result = await Subscription.deleteOne({_id: subscription_id});
        return result;
    }
    
    async deleteAllSubscriptions (subscriber_id)  {
        const result = await Subscription.deleteMany({subscriber_id: subscriber_id});
        return result;
    }
    
    async resetAmountBilledToday ()  {
        const result = await Subscription.updateMany({},{$set: { amount_billed_today : 0}});
        return result;
    }
    
    async markSubscriptionInactive (subscription_id)  {
        if (subscription_id) { 
            const query = { _id: subscription_id };
            const result = await Subscription.updateOne(query, { $set: { active: false } });
            if (result.nModified === 0) {
                return undefined;
            }else{
                let subscription = await getSubscription(subscription_id);
                return subscription;
            }
        } else {
             return undefined;
        }
    }
    
    async unsubscribe (subscription_id)  {
        if (subscription_id) { 
            const query = { _id: subscription_id };
            const result = await Subscription.updateOne(query, { $set: { auto_renewal: false, subscription_status: 'expired' } });
            if (result.nModified === 0) {
                return undefined;
            }else{
                let subscription = await getSubscription(subscription_id);
                return subscription;
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
    //         let subscriber = subscriberRepo.getSubscriber(userId);
    //         await deleteSubscriber(userId);
    //         await deleteAllSubscriptions(subscriber._id);
    //         await this.historyRepo.deleteMany(userId);
    
    //         console.log(`The MSISDN ${msisdn} records deleted successfully`);
    //     } else {
    //         console.log(`The MSISDN ${msisdn} failed to delete records`);
    //     }
    // }
    
    async getSubscriptionsToMark ()  {
        let now = moment();
        let endOfDay = now.endOf('day').tz("Asia/Karachi");
        console.log("endOfDay",endOfDay);
    
        let results = await Subscription.find(
            {$or:[{subscription_status:'billed'},{subscription_status:'graced'},{subscription_status:'trial'}], 
            next_billing_timestamp: {$lte: endOfDay}, active: true}).select('_id');
        
            let subscription_ids = results.map(subscription => {
            return subscription._id;
        });
        return subscription_ids;
    }
    
    async setAsBillableInNextCycle (subscription_ids)  {
        await Subscription.updateMany({_id: {$in :subscription_ids}},{$set:{is_billable_in_this_cycle: true}});
    }
}





module.exports = SubscriptionRepository;