const mongoose = require('mongoose');
const User = mongoose.model('User');



class RemoveDuplicateMsisdnsScript {
    constructor({userRepository,subscriberRepository, subscriptionRepository}){
        this.userRepository = userRepository;
        this.subscriberRepository = subscriberRepository;
        this.subscriptionRepository = subscriptionRepository
    }

    async removeDuplicateMsisdns(){
        try {
            console.log("=> Done 1")
            let shouldRemove = await this.userRepository.getMoreThanOneMsisdns();
            console.log("Done 2")
            let increment = 0;

            let ids = [];
            for(let i = 0; i < shouldRemove.length; i++){
                let multiples = shouldRemove[i].dupsUsers;
                const sortedUsers = multiples.sort((a, b) => a.added_dtm - b.added_dtm)
                //console.log('=> ', increment, ' msisdn: ', shouldRemove[i]._id, ' - count - ', shouldRemove[i].count, ' sorted ', JSON.stringify(sortedUsers));
                console.log('=> ', increment);
                for(let j = 1; j < sortedUsers.length; j++){
                    ids.push(sortedUsers[j]._id);
                }
                increment++;

            }

            try{
                console.log('=> -----------------------------');
                console.log('=>', ids);
                console.log('=> -----------------------------');
                let data = await this.userRepository.updateMany(ids);
                console.log('=> updated users ', data);

                data = await this.subscriberRepository.updateMany(ids);
                console.log('=> updated subscribers ', data);

                let shouldRemoveSubs = await this.subscriberRepository.getShouldRemove();
                let shouldRemoveSubscriberIds = [];
                for(let i = 0; i < shouldRemoveSubs.length; i++){
                    shouldRemoveSubscriberIds.push(shouldRemoveSubs[i]._id);
                }
                data = await this.subscriptionRepository.updateMany(shouldRemoveSubscriberIds);
                console.log('=> updated subscriptions ', data);
                console.log("=> Done");
            }catch(e){
                console.log('=>', e);
            }


            // console.log("userIdsToRemove",userIdsToRemove[0]["ids"]);
            /*let userids = userIdsToRemove[0]["ids"];
            console.log("[rms]",userids)
            let userCount = await User.count({"_id": {$in: userids }});
            console.log("[rms]userCount",userCount);
            User.updateMany({"_id": {$in:userids }},{$set:{should_remove: true}}).then(async (data) => {
                console.log("[rms]Data",data);
                let subscriber_ids = await Subscriber.find({"user_id": {$in: userids }}).select('_id');
                console.log("[rms]subscriber_ids got",subscriber_ids.length);
                subscriber_ids = subscriber_ids.map(id => {return id._id});
                // console.log("subscriber_ids",subscriber_ids);
                let result1 = await Subscriber.updateMany({"user_id": {$in: userids }},{$set:{should_remove: true}},{multi: true});
                console.log("[rms]subscriber",result1);
                let result2 = await Subscription.updateMany({"subscriber_id": {$in: subscriber_ids }},{$set:{should_remove: true}},{multi: true});
                console.log("[rms]subscriber",result2);
            }).catch(err => {
                console.log("[rms]Error",err);
            });*/
        } catch (err) {
            console.error(err);
        }
    }

   
}

module.exports = RemoveDuplicateMsisdnsScript;