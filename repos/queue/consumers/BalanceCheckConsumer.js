const config = require('../../../config');
const repo = require('../../../repos/ChargingAttemptRepo');
const billingRepo = require('../../../repos/BillingRepo');
const historyRepo = require('../../../repos/BillingHistoryRepo');
const userRepo = require('../../../repos/UserRepo');
const packageRepo = require('../../../repos/PackageRepo');
const subscriberRepo = require('../../../repos/SubscriberRepo');

microChargingAttempt = async (subscriber) => {
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
			// Pick the ceiling value
			flooringValue = splitted[0];
			ceilingValue = splitted[1];

			if(flooringValue > packagePrice){
				ceilingValue = packagePrice;
			}
		}else{
			// Band is not available. E.g: More than 50
			let currentpackagePrice = packagePrice;
			currentpackagePrice-=1;
			ceilingValue = currentpackagePrice;
			flooringValue = 1;
		}

		let attempt = await repo.getAttempt(subscriber._id);
		if(attempt && attempt.active === true){
			let currentPrice = attempt.price_to_charge;
			if(currentPrice === 0){
				// Means not tried for micro charging before or it has been reset
				let updated = await repo.updateAttempt(subscriber._id, {"price_to_charge": ceilingValue});
				if(updated){
					console.log('MicroChargingAttempt - Scheduled For Price - ',ceilingValue, ' - Subscriber ', subscriber._id, ' - ', (new Date()));
				}
			}else{
				currentPrice-=1;
				if(currentPrice > 0 && currentPrice >= flooringValue){
					// Must be between balance band
					let updated = await repo.updateAttempt(subscriber._id, {"price_to_charge": currentPrice});
					if(updated){
						console.log('MicroChargingAttempt - AgainScheduled For Price - ',currentPrice, ' - Subscriber ', subscriber._id, ' - ', (new Date()));
					}
				}else{
					// Less than flooring value or as soon as it becomes zero
					await repo.updateAttempt(subscriber._id, {"price_to_charge": currentPrice});
                    await repo.markInActive(subscriber._id);

                    let nextBillingDate = new Date();
                    nextBillingDate.setHours(nextBillingDate.getHours() + config.time_between_billing_attempts_hours);
                
                    let subscriberUpdated = await subscriberRepo.updateSubscriber(subscriber.user_id, {next_billing_dtm: nextBillingDate});
                    if(subscriberUpdated){
                        console.log('MicroCharging - InActive - Subscriber Updated ', subscriber._id, ' - ', (new Date()));
                    }else{
                        console.log('MicroCharging - InActive - Subscriber Not Updated', subscriber._id, ' - ', (new Date()));
                    }
				}
			}
		}
		
	}).catch(async(err) => {
		console.log("Error fetching balance: ", err);
		billlHistory.operator_response = err.message;
		billlHistory.billing_status = "balance-fetch-error"
		await historyRepo.createBillingHistory(billlHistory);
	});
}

module.exports = {
    microChargingAttempt: microChargingAttempt
}