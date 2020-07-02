const config = require('../config');
const container = require('../configurations/container');

const userRepo = container.resolve("userRepository");
const subscriberRepo = container.resolve("subscriberRepository");
const subscriptionRepo = container.resolve("subscriptionRepository");
const billingHistoryRepo = container.resolve('billingHistoryRepository');

exports.getSubscriptionDetails = async (req, res) => {
	let { msisdn } = req.query;

	let obj = {};
	if (msisdn) {
		let user = await userRepo.getUserByMsisdn(msisdn);
		if(user) {
			let subscriber = await subscriberRepo.getSubscriberByUserId(user._id);
			if(subscriber){
				let rawSubscriptions = await subscriptionRepo.getAllSubscriptions(subscriber._id);
				let subscriptions = [];
				if(rawSubscriptions){
					for(let i = 0; i < rawSubscriptions.length; i++){
						let sub = {};
						sub.user_id = user._id;
						sub.subscriber_id = rawSubscriptions[i].subscriber_id;
						sub.subscription_id = rawSubscriptions[i]._id;
						sub.paywall_id = rawSubscriptions[i].paywall_id;
						sub.subscribed_package_id = rawSubscriptions[i].subscribed_package_id;
						sub.subscription_status = rawSubscriptions[i].subscription_status;
						sub.source = rawSubscriptions[i].source;
						sub.added_dtm = rawSubscriptions[i].added_dtm;
						sub.is_allowed_to_stream = rawSubscriptions[i].is_allowed_to_stream;
						sub.date_on_which_user_entered_grace_period = rawSubscriptions[i].date_on_which_user_entered_grace_period;
						
						let expiryArray = [];
						if(rawSubscriptions[i].subscription_status === "expired"){
							expiryArray = await getExpiry(user._id, rawSubscriptions[i].subscribed_package_id);
						}
						
						sub.expiry = expiryArray;
						subscriptions.push(sub);
					}
					obj.subscriptions = subscriptions;
					res.send({code: config.codes.code_success, data: obj});
				}else{
					res.send({code: config.codes.code_data_not_found, message: 'No Subscription Found'});
				}

			}else{
				res.send({code: config.codes.code_data_not_found, message: 'Subscriber not found'});
			}
		}else{
			res.send({code: config.codes.code_data_not_found, message: 'User not found'});
		}
	} else {
		res.send({code: config.codes.code_invalid_data_provided, message: 'No msisdn provided'});
	}
}

getExpiry = async(user_id, package_id) => {
	let rawHistories = await billingHistoryRepo.getExpiryHistory(user_id, package_id);

	if(rawHistories.length >= 2){
		rawHistories.sort(function(a,b){
			return new Date(a.billing_dtm) - new Date(b.billing_dtm);
		});
	}

	let histories = [];
	for(let i = 0; i < rawHistories.length; i++){
		let history = {};
		history.source = rawHistories[i].source;
		history.status = rawHistories[i].billing_status;
		history.billing_dtm = rawHistories[i].billing_dtm;
		histories.push(history);
	}

	if(histories.length > 3){
		return histories.slice(0, 3);
	}
	return histories;
	
}

// UPDATE
exports.put = async (req, res) => {
	const result = await repo.updateSubscriber(req.params.msisdn, req.body);
	if (result) {
		res.send({'code': config.codes.code_record_updated, data : result});
	}else {
		res.send({'code': config.codes.code_data_not_found, data: 'No subscriber with this msisdn found!'});
	}
}