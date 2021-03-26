const config = require('../config');
const { resolve } = require('../configurations/container');

const helper = require('../helper/helper');

class TelenorBillingService {

    constructor({
        subscriptionRepository,billingHistoryRepository,
        tpsCountRepository,billingRepository, packageRepository,
        messageRepository,userRepository}){
            this.subscriptionRepo = subscriptionRepository;
            this.billingHistoryRepo = billingHistoryRepository;
            this.billingRepo = billingRepository;
            this.tpsCountRepo = tpsCountRepository;
            this.packageRepo = packageRepository;
            this.messageRepo = messageRepository;
            this.userRepo = userRepository;
    }

    async processDirectBilling(user, subscription, packageObj, first_time_billing) {
        return new Promise( async (resolve,reject) => {
            let subscription_id = "";
            if (subscription._id) {
                subscription_id = subscription._id;
            } else {
                subscription_id = user._id;
            }
            let transaction_id = user.msisdn+"_"+this.getRandomInt(100000);
            //let transaction_id = "GoonjDirectCharge_"+subscription_id+"_"+packageObj.price_point_pkr+"_"+helper.getCurrentDate();
            
            let returnObj = {};

            try{
                // Check if the subscription is active or blocked for some reason.
                returnObj.transaction_id = transaction_id;
                try{
                    let response = await this.billingRepo.processDirectBilling(user.msisdn, packageObj, transaction_id);
                    console.log("response from billingRepo",response.data);
                    let message = response.data.Message;
                    
                    if(message === "Success"){
                        //Direct billing success, update records
                        returnObj.message = "success";
                        returnObj.response = response.data;
                    }else{
                        returnObj.message = "failed";
                        returnObj.response = response.data;
                    }
                    resolve(returnObj);
                }catch(error){
                    console.log("Error message", error.message, user.msisdn);
                    returnObj.message = "failed";
                    if(error && error.response && error.response.data){
                        returnObj.response = error.response.data
                    }

                    if(error && error.response && error.response.data && (error.response.data.errorCode === "500.007.08" || (error.response.data.errorCode === "500.007.05" &&
                    error.response.data.errorMessage === "Services of the same type cannot be processed at the same time."))){
                        returnObj.noAck = true;
                    }
                    resolve(returnObj);
                }       
            }catch(error){
                console.log(error);
                resolve(returnObj);
            }
        });
    }

    getRandomInt(max) {
        return Math.floor(Math.random() * Math.floor(max));
    }
}

module.exports = TelenorBillingService;