const mongoose = require('mongoose');
const User = mongoose.model('User');
const Subscription = mongoose.model('Subscription');
const Subscriber = mongoose.model('Subscriber');



class RemoveDuplicateMsisdnsScript {
    constructor({userRepository,subscriberRepository}){
        this.userRepository = userRepository;
        this.subscriberRepository = subscriberRepository;
    }

    async removeDuplicateMsisdns(){
        try {
            console.log("removeDuplicateMsisdns")
            let shouldRemove = await this.userRepository.getMoreThanOneMsisdns();
            for(let i = 0; i < shouldRemove.length; i++){
                let multiples = shouldRemove[i].dupsUsers;
                const sortedUsers = multiples.sort((a, b) => b.added_dtm - a.added_dtm)
                console.log('=> msisdn: ', shouldRemove[i].msisdn, ' - count - ', shouldRemove[i].count, ' sorted ', sortedUsers);
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