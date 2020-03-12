const config = require('../config');
const repo = require('../repos/ChargingAttemptRepo');
const billingRepo = require('../repos/BillingRepo');
const historyRepo = require('../repos/BillingHistoryRepo');
const userRepo = require('../repos/UserRepo');
const packageRepo = require('../repos/PackageRepo');

microChargingAttempt = async (user_id, subscriber_id) => {
	let user = await userRepo.getUserById(user_id);
	let package = await packageRepo.getPackage({_id: user.subscribed_package_id});
	let packagePrice = package.price_point_pkr;

	let billlHistory = {};
	billlHistory.user_id = user_id;
	
	billlHistory.package_id = package._id;
	billlHistory.operator = "telenor";

	billingRepo.checkBalance(user.msisdn).then(async(result) => {
		billlHistory.transaction_id = result.CorrelationID;
		billlHistory.operator_response = result;
		billlHistory.billing_status = "balance-fetched"
		await historyRepo.createBillingHistory(billlHistory);

		let band = result.BalanceBand;
		let ceilingValue, flooringValue;
		let splitted = band.split("-");
		if(splitted.length == 2){
			// Band is available e.g. 5-10
			// Pick the ceiling value
			flooringValue = splitted[0];
			if(flooringValue === 0){
				flooringValue = 1;
			}

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

		let attempt = await repo.getAttempt(subscriber_id);
		if(attempt){
			let currentPrice = attempt.price_to_charge;
			if(currentPrice === 0){
				// Means not tried for micro charging before or it has been reset
				let updated = await repo.updateAttempt(subscriber_id, {"price_to_charge": ceilingValue});
				if(updated){
					console.log('MicroChargingAttempt - Scheduled - Price - ',ceilingValue, ' - Subscriber ', subscriber_id, ' - ', (new Date()));
				}
			}else{
				currentPrice-=1;
				if(currentPrice > 0 && currentPrice >= flooringValue){
					// Must be between balance band
					let updated = await repo.updateAttempt(subscriber_id, {"price_to_charge": currentPrice});
					if(updated){
						console.log('MicroChargingAttempt - AgainScheduled - Price - ',currentPrice, ' - Subscriber ', subscriber_id, ' - ', (new Date()));
					}
				}else{
					// Less than flooring value or as soon as it becomes zero
					await repo.markInActive(subscriber_id);
					console.log('MicroCharging - InActive - Subscriber ', subscriber_id, ' - ', (new Date()));
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