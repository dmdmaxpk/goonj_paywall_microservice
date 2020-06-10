const mongoose = require('mongoose');
const ChargingAttempt = mongoose.model('ChargingAttempt');

class ChargingAttemptRepository {
    constructor(){}
    async createAttempt (postData)  {
        postData.number_of_total_attempts = 1;
        let attempt = new ChargingAttempt(postData);
        let result = await attempt.save();
        return result;
    }
    
    async incrementAttempt (subscription_id)  {
        let attempt = await getAttempt(subscription_id);
        if(attempt){
            let numberOfTodaysAttempts = attempt.number_of_attempts_today;
            let numberOfTotalAttempts = attempt.number_of_total_attempts;
            
            numberOfTodaysAttempts+=1;
            numberOfTotalAttempts+=1;
    
            let updatedAttempts = await updateAttempt(subscription_id, {
                number_of_attempts_today: numberOfTodaysAttempts,
                number_of_total_attempts: numberOfTotalAttempts
            });
            return updatedAttempts;
        }else{
            let obj = {};
            obj.subscriber_id = subscriber_id;
            obj.number_of_attempts_today = 1;
            obj.number_of_total_attempts = 1;
            let newAttempt = await createAttempt(obj);
            return newAttempt;
        }
    }
    
    async getAttempt (subscription_id)  {
        let result = await ChargingAttempt.findOne({subscription_id: subscription_id});
        return result;
    }
    
    async resetAttempts (subscription_id)  {
        let result = await updateAttempt(subscription_id, {number_of_attempts_today: 0, price_to_charge: 0});
        return result;
    }
    
    async markInActive (subscription_id)  {
        let result = await updateAttempt(subscription_id, {active: false, queued: false});
        return result;
    }
    
    async markActive (subscription_id) {
        let result = await updateAttempt(subscription_id, {active: true, queued: false});
        return result;
    }
    
    async queue (subscription_id)  {
        let result = await updateAttempt(subscription_id, {queued: true});
        return result;
    }
    
    async unqueue (subscription_id) {
        let result = await updateAttempt(subscription_id, {queued: false});
        return result;
    }
    
    async updateAttempt (subscription_id, postData) {
        const query = { subscription_id: subscription_id };
        postData.last_modified = new Date();
        
        const result = await ChargingAttempt.updateOne(query, postData);
        if (result.nModified === 0) {
            return undefined;
        }else{
            let attempt = await getAttempt(subscription_id);
            return attempt;
        }
    }
}


module.exports = ChargingAttemptRepository;