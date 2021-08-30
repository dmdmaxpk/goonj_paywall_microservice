const mongoose = require('mongoose');
const { timeout } = require('../helper/helper');
const Subscriptions = mongoose.model('Subscription');
const Subscribers = mongoose.model('Subscriber');

class AddUsersToSubscriptions {
    constructor({subscriberRepository, subscriptionRepository}){
        this.subscriberRepository = subscriberRepository;
        this.subscriptionRepository = subscriptionRepository
    }


    async AddUsersToSubs(){
        let limit = 20000;
        let count = 20000, i = 0;
        while(count == limit){
            let subscribers = await Subscribers.find({isMigrated: false}).limit(limit);
            count = subscribers.length;
            i++;
            console.log('subscribers count', count, 'i', i, 'updated count', i * limit);
            await this.migrate(subscribers);
        }
        console.log('fin');
    }
    async migrate(subs){
        subs.forEach(async(obj) => {
            await Subscriptions.updateMany({subscriber_id: obj._id}, {user_id: obj.user_id});
            await Subscribers.updateOne({_id: obj._id}, {isMigrated: true});
        })
    }
   
}

module.exports = AddUsersToSubscriptions;