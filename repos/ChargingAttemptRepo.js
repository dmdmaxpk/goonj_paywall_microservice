const mongoose = require('mongoose');
const ChargingAttempt = mongoose.model('ChargingAttempt');

createAttempt = async(postData) => {
    postData.number_of_total_attempts = 1;
    let attempt = new ChargingAttempt(postData);
    let result = await attempt.save();
    return result;
}

incrementAttempt = async(subscriber_id) => {
    let attempt = await getAttempt(subscriber_id);
    if(attempt){
        let numberOfTodaysAttempts = attempt.number_of_attempts_today;
        let numberOfTotalAttempts = attempt.number_of_total_attempts;
        
        numberOfTodaysAttempts+=1;
        numberOfTotalAttempts+=1;

        let updatedAttempts = await updateAttempt(subscriber_id, {
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

getAttempt = async(subscriber_id) => {
    result = await ChargingAttempt.findOne({subscriber_id: subscriber_id});
	return result;
}

resetAttempts = async(subscriber_id) => {
    let result = await updateAttempt(subscriber_id, {number_of_attempts_today: 0, price_to_charge: 0});
	return result;
}

markInActive = async(subscriber_id) => {
    let result = await updateAttempt(subscriber_id, {active: false});
	return result;
}

markActive = async(subscriber_id) => {
    let result = await updateAttempt(subscriber_id, {active: true});
	return result;
}

updateAttempt = async(subscriber_id, postData) => {
    const query = { subscriber_id: subscriber_id };
    postData.last_modified = new Date();
    
    const result = await ChargingAttempt.updateOne(query, postData);
    if (result.nModified === 0) {
        return undefined;
    }else{
        let attempt = await getAttempt(subscriber_id);
        return attempt;
    }
}

module.exports = {
    createAttempt: createAttempt,
    incrementAttempt: incrementAttempt,
    resetAttempts: resetAttempts,
    getAttempt: getAttempt,
    updateAttempt: updateAttempt
}