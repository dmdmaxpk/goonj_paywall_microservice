const config = require('../../../config');
const repo = require('../../../repos/ChargingAttemptRepo');
const billingRepo = require('../../../repos/BillingRepo');
const historyRepo = require('../../../repos/BillingHistoryRepo');
const userRepo = require('../../../repos/UserRepo');
const packageRepo = require('../../../repos/PackageRepo');
const subscriberRepo = require('../../../repos/SubscriberRepo');

microChargingAttempt = async (subscriber) => {
    return new Promise(async (resolve,reject) => {
        let user = await userRepo.getUserById(subscriber.user_id);
        let package = await packageRepo.getPackage({_id: user.subscribed_package_id});
        let packagePrice = package.price_point_pkr;
    
        let billlHistory = {};
        billlHistory.user_id = user._id;
        
        billlHistory.package_id = package._id;
        billlHistory.operator = "telenor";
    
        billingRepo.checkBalance(user.msisdn).then(async(result) => {
            billlHistory.transaction_id = result.CorrelationID;
            billlHistory.operator_response = result;
            billlHistory.billing_status = "balance-fetched-successfully"
            await historyRepo.createBillingHistory(billlHistory);
    
            let band = result.BalanceBand;
            let ceilingValue, flooringValue;
            let splitted = band.split("-");
            if(splitted.length == 2){
                // Band is available e.g. 5-10
                flooringValue = splitted[0];
                ceilingValue = splitted[1];
            }else{
                // Band is not available. E.g: More than 50
                ceilingValue = (packagePrice-1);
                flooringValue = 1;
            }
    
            let attempt = await repo.getAttempt(subscriber._id);
            if(attempt && attempt.active === true){
                let attemptPrice = attempt.price_to_charge;
                if(attemptPrice === 0){
                    // Means not tried for micro charging before or it has been reset
                    let updated = await repo.updateAttempt(subscriber._id, {"price_to_charge": ceilingValue});
                    if(updated){
                        console.log('MicroChargingAttempt - Scheduled For Price - ',ceilingValue, ' - Subscriber ', subscriber._id, ' - ', (new Date()));
                    }
                }else{
                    let price_to_charge = attemptPrice;
                    if(ceilingValue < attemptPrice){
                        price_to_charge = ceilingValue;    
                    }else{
                        price_to_charge-=1;
                    }

                    // Must be between balance band
                    if(price_to_charge > 0 && price_to_charge >= flooringValue){
                        
                        // If the price to charge is greater than package's actual price, charge for package price only
                        if(price_to_charge >= packagePrice){
                            let updated = await repo.updateAttempt(subscriber._id, {"price_to_charge": packagePrice});
                            if(updated){
                                console.log('MicroChargingAttempt - AgainScheduled For Package Actual Price - ',packagePrice, ' - Subscriber ', subscriber._id, ' - ', (new Date()));
                            }
                        }else{
                            let updated = await repo.updateAttempt(subscriber._id, {"price_to_charge": price_to_charge});
                            if(updated){
                                console.log('MicroChargingAttempt - AgainScheduled For Price - ',price_to_charge, ' - Subscriber ', subscriber._id, ' - ', (new Date()));
                            }
                        }
                        let subscriberUpdated = await subscriberRepo.updateSubscriber(subscriber.user_id, {is_billable_in_this_cycle:true});
                        if(subscriberUpdated){
                            console.log('MicroCharging - InActive - Subscriber Updated ', subscriber._id, ' - ', (new Date()));
                        }else{
                            console.log('MicroCharging - InActive - Subscriber Not Updated', subscriber._id, ' - ', (new Date()));
                        }
                        
                    }else{
                        // Less than flooring value or as soon as it becomes zero
                        await repo.updateAttempt(subscriber._id, {"price_to_charge": price_to_charge});
                        await repo.markInActive(subscriber._id);
    
                        let nextBillingDate = new Date();
                        nextBillingDate.setHours(nextBillingDate.getHours() + config.time_between_billing_attempts_hours);
                    
                        let subscriberUpdated = await subscriberRepo.updateSubscriber(subscriber.user_id, {next_billing_timestamp: nextBillingDate,is_billable_in_this_cycle:false});
                        if(subscriberUpdated){
                            console.log('MicroCharging - InActive - Subscriber Updated ', subscriber._id, ' - ', (new Date()));
                        }else{
                            console.log('MicroCharging - InActive - Subscriber Not Updated', subscriber._id, ' - ', (new Date()));
                        }
                    }
                }
            }
            resolve('Success');
        }).catch(async(err) => {
            console.log("Error fetching balance: ", err);
            billlHistory.operator_response = err.message;
            billlHistory.billing_status = "balance-fetch-error";
            await historyRepo.createBillingHistory(billlHistory);
            reject(err);
        });
    })
	
}

module.exports = {
    microChargingAttempt: microChargingAttempt
}