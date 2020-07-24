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
            let userIdsToRemove = await this.userRepository.getDuplicatedMsisdnUsers();
            // console.log("userIdsToRemove",userIdsToRemove[0]["ids"]);
            let userids = userIdsToRemove[0]["ids"];
            console.log(userids)
            let userCount = await User.count({"_id": {$in: userids }});
            console.log("userCount",userCount);
            User.updateMany({"_id": {$in:userids }},{$set:{should_remove: true}}).then(async (data) => {
                console.log("Data",data);
                let subscriber_ids = await Subscriber.find({"user_id": {$in: userids }}).select('_id');
                console.log("subscriber_ids got",subscriber_ids.length);
                subscriber_ids = subscriber_ids.map(id => {return id._id});
                // console.log("subscriber_ids",subscriber_ids);
                let result1 = await Subscriber.updateMany({"user_id": {$in: userids }},{$set:{should_remove: true}},{multi: true});
                console.log("subscriber",result1);
                let result2 = await Subscription.updateMany({"subscriber_id": {$in: subscriber_ids }},{$set:{should_remove: true}},{multi: true});
                console.log("subscriber",result2);
            }).catch(err => {
                console.log("Error",err);
            });
        } catch (err) {
            console.error(err);
        }
    }

   
}

module.exports = RemoveDuplicateMsisdnsScript;