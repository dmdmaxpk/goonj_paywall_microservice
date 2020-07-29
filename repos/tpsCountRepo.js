const mongoose = require('mongoose');
const TpsCount = mongoose.model('TpsCount');
const config = require('../config');

class TPSCountRepository {
    async incrementTPSCount (queueName, source = 'telenor')  {
        if (queueName) {
            let query = {};
            if (queueName === config.queueNames.messageDispathcer) {
                query = {$inc: {messagetpsCount: 1}};
            } else if (queueName === config.queueNames.subscriptionDispatcher) {
                query = {$inc: {subscriptiontpsCount: 1}};
            } else if (queueName === config.queueNames.balanceCheckDispatcher) {
                query = {$inc: {balanceCheckCount: 1}};
            } else if (queueName === config.queueNames.subscriberQueryDispatcher) {
                query = {$inc: {subscriptionquerytpsCount: 1}};
            } else if (queueName === config.queueNames.freeMbsDispatcher) {
                query = {$inc: {freeMbsCount: 1}};
            }  else if (queueName === config.queueNames.easypaisaDispatcher) {
                query = {$inc: {easypaisatpsCount: 1}};
            }  
            await TpsCount.update({},query);
            return true;
        } else {
            let error = new Error();
            error.message = "Queue name needs to be provided"
            return error;
        }
    }
    
    async getTPSCount (queueName) {
        if (queueName) {
            let query = {};
            let fieldName = ""
            if (queueName === config.queueNames.messageDispathcer) {
                query = {messagetpsCount: 1};
                fieldName = "messagetpsCount";
            } else if (queueName === config.queueNames.subscriptionDispatcher) {
                query =  {subscriptiontpsCount: 1};
                fieldName = "subscriptiontpsCount";
            } else if (queueName === config.queueNames.balanceCheckDispatcher) {
                query =  {balanceCheckCount: 1};
                fieldName = "balanceCheckCount";
            } else if (queueName === config.queueNames.subscriberQueryDispatcher) {
                query =  {subscriptionquerytpsCount: 1};
                fieldName = "subscriptionquerytpsCount";
            } else if (queueName === config.queueNames.freeMbsDispatcher) {
                query =  {freeMbsCount: 1};
                fieldName = "freeMbsCount";
            }else if (queueName === config.queueNames.easypaisaDispatcher) {
                query =  {easypaisaDispatcher: 1};
                fieldName = "easypaisatpsCount";
            }
            try {
                let tps = await TpsCount.findOne({},fieldName);
                return tps[fieldName];
            } catch(er) {
                console.error(er);
            }     
        } else {
            let error = new Error();
            error.message = "Queue name needs to be provided"
            return error;
        }
    }
    
    async resetTPSCount  ()  {
        try {
            let updated = await TpsCount.update({},{$set:{ messagetpsCount: 0  , subscriptiontpsCount: 0, balanceCheckCount: 0, subscriptionquerytpsCount: 0, freeMbsCount: 0, easypaisatpsCount: 0  }},{upsert: true});
        } catch (err) {
            throw err;
        }
    }
}




module.exports = TPSCountRepository;