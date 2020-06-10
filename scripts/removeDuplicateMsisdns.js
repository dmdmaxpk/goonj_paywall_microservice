const mongoose = require('mongoose');


class RemoveDuplicateMsisdnsScript {
    constructor({userRepository,subscriberRepository}){
        this.userRepository = userRepository;
        this.subscriberRepository = subscriberRepository;
    }

    async removeDuplicateMsisdns(){
        try {
            let userIdsToRemove = await this.userRepository.getDuplicatedMsisdnUsers();
            console.log("userIdsToRemove",userIdsToRemove[0].ids);
            let user_ids = userIdsToRemove[0].ids;
            await this.subscriberRepository.removeByUserIds(user_ids);
            await this.userRepository.removeByIds(user_ids);
            console.log("userIdsToRemove-Done");
        } catch (err) {
            console.error(err);
        }
    }

   
}

module.exports = RemoveDuplicateMsisdnsScript;