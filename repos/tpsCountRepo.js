const mongoose = require('mongoose');
const TpsCount = mongoose.model('TpsCount');


incrementTPSCount = async(queueName) => {
    if (queueName) {
        let query = {};
        if (queueName === "message") {
            query = {$inc: {messagetpsCount: 1}};
        } else if (queueName === "subscrition") {
            query = {$inc: {subscriptiontpsCount: 1}};
        }        
        await TpsCount.update({},query);
        return true;
    } else {
        let error = new Error();
        error.message = "queueName needs to be provided"
        return error;
    }
}

getTPSCount = async(queueName) => {
    if (queueName) {
        let query = {};
        let fieldName = ""
        if (queueName === "message") {
            query = {messagetpsCount: 1};
            fieldName = "messagetpsCount";
        } else if (queueName === "subscription") {
            query =  {subscriptiontpsCount: 1};
            fieldName = "subscriptiontpsCount";
        }
        try {
            let tps = await TpsCount.findOne({},fieldName);
            console.log('tps',tps)
            return tps[fieldName];
        } catch(er) {
            console.error(er);
        }     
    } else {
        let error = new Error();
        error.message = "queueName needs to be provided"
        return error;
    }
}

resetTPSCount = async(queueName) => {
    try {
        let updated = await TpsCount.update({},{$set:{ messagetpsCount: 0  , subscriptiontpsCount: 0   }},{upsert: true});
    } catch (err) {
        throw err;
    }
}


module.exports = {
    resetTPSCount: resetTPSCount,
    getTPSCount: getTPSCount,
    incrementTPSCount: incrementTPSCount
}