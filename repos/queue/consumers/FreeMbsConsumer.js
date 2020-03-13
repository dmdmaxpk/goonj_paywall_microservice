
const billingRepo = require('../../BillingRepo');
const historyRepo = require('../../BillingHistoryRepo');
const userRepo = require('../../UserRepo');
const packageRepo = require('../../PackageRepo');
const shortId = require('shortid');

subscribeFreeMbs = async (message) => {
    let subscriber = JSON.parse(message.content);
    return new Promise(async (resolve,reject) => {
        let user = await userRepo.getUserById(subscriber.user_id);
        let package = await packageRepo.getPackage({_id: user.subscribed_package_id});
        let transaction_id = "GoonjMbs_"+user.msisdn+"_"+user.subscribed_package_id+"_"+shortId.generate()+"_"+(new Date());

        let billlHistory = {};
        billlHistory.user_id = user._id;
        billlHistory.transaction_id = transaction_id;
        billlHistory.package_id = package._id;
        billlHistory.operator = "telenor";
    
        billingRepo.subscribeFreeMbs(user.msisdn, transaction_id).then(async(result) => {
            billlHistory.operator_response = result;
            billlHistory.billing_status = "free-mbs-offer-subscribed";
            await historyRepo.createBillingHistory(billlHistory);
            resolve(result);
        }).catch(async(err) => {
            console.log("Error subscribing free mbs: ", err);
            billlHistory.operator_response = err.message;
            billlHistory.billing_status = "free-mbs-offer-subscribe-error";
            await historyRepo.createBillingHistory(billlHistory);
            reject(err);
        });
    })
	
}

module.exports = {
    subscribeFreeMbs: subscribeFreeMbs
}