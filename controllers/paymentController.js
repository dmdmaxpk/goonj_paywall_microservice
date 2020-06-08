const config = require('../config');
const container = require("../configurations/container")
const otpRepo = require('../repos/OTPRepo');
const userRepo = container.resolve("userRepository");
const subscriberRepo = container.resolve("subscriberRepository");
const packageRepo = container.resolve("packageRepository");
const billingHistoryRepo = container.resolve("billingHistoryRepository");
const viewLogRepo = require('../repos/ViewLogRepo');

const shortId = require('shortid');
const axios = require('axios');
const messageRepo = container.resolve("messageRepository");
const blockUsersRepo = require('../repos/BlockedUsersRepo');

const billingRepo = container.resolve("billingRepository");
const subscriptionRepo = container.resolve("subscriptionRepository")
let jwt = require('jsonwebtoken');


function sendMessage(otp, msisdn){
	let message = `Use code ${otp} for Goonj TV`;
	let messageObj = {};
	messageObj.message =  message;
	messageObj.msisdn = msisdn;
	
	// Add object in queueing server
	console.log('OTP - AddedInQueue - MSISDN - ', msisdn, ' - OTP - ', otp, ' - ', (new Date()));
	if (messageObj.msisdn && messageObj.message) {
		rabbitMq.addInQueue(config.queueNames.messageDispathcer, messageObj);
	} else {
		console.log('Critical parameters missing',messageObj.msisdn,messageObj.message);
	}
}

function sendTextMessage(text, msisdn){
	let message = text;
	let messageObj = {};
	messageObj.message =  message;
	messageObj.msisdn = msisdn;
	
	// Add object in queueing server
	console.log('Send Message - AddedInQueue - MSISDN - ', msisdn, ' - Message - ', text, ' - ', (new Date()));
	if (messageObj.msisdn && messageObj.message) {
		rabbitMq.addInQueue(config.queueNames.messageDispathcer, messageObj);
	} else {
		console.log('Critical parameters missing',messageObj.msisdn,messageObj.message);
	}
}

subscribePackage = async(subscription, packageObj) => {

	let user = await userRepo.getUserBySubscriptionId(subscription._id);
	let transactionId = "Goonj_"+user.msisdn+"_"+packageObj._id+"_"+shortId.generate()+"_"+getCurrentDate();
	
	let subscriptionObj = {};
	subscriptionObj.user = user;
	subscriptionObj.packageObj = packageObj;
	subscriptionObj.subscription = subscription;
	subscriptionObj.transactionId = transactionId;

	// Add object in queueing server
	if (subscription.queued === false && subscriptionObj.user && subscriptionObj.packageObj && subscriptionObj.packageObj.price_point_pkr && subscriptionObj.transactionId ) {
		let updated = await subscriptionRepo.updateSubscription(subscription._id, {queued: true, auto_renewal: true});
		if(updated){
			rabbitMq.addInQueue(config.queueNames.subscriptionDispatcher, subscriptionObj);
			console.log('Payment - Subscription - AddInQueue - ', subscription._id, ' - ', (new Date()));
		}else{
			console.log('Failed to updated subscriber after adding in queue.');
		}
	} else {
		console.log('Could not add in Subscription Queue because critical parameters are missing ', subscriptionObj.msisdn ,
		subscriptionObj.packageObj.price_point_pkr,subscriptionObj.transactionId, ' - ', (new Date()) );
	}
}


// Generate OTP and save to collection
exports.sendOtp = async (req, res) => {
	let gw_transaction_id = req.body.transaction_id;

	let msisdn = req.body.msisdn;
	let user = await userRepo.getUserByMsisdn(msisdn);

	// Means no user in DB, let's create one but first check if the coming user has valid active telenor number
	if(!user){
		let response;
		try{
			response = await billingRepo.subscriberQuery(msisdn);
		}catch(err){
			response = err;
		}

		console.log(response);
		
		if(response.operator === "telenor"){
			// valid customer
			let userObj = {};
			userObj.msisdn = msisdn;
			userObj.subscribed_package_id = 'none';
			userObj.source = req.body.source ? req.body.source : 'na';
			userObj.operator = "telenor";

			if(req.body.marketing_source){
				userObj.marketing_source = req.body.marketing_source;
			}
	
			try {
				user = await userRepo.createUser(userObj);
				console.log('Payment - OTP - UserCreated - ', user.msisdn, ' - ', user.source, ' - ', (new Date()));
				generateOtp(res, msisdn, user, gw_transaction_id);
			} catch (err) {
				res.send({code: config.codes.code_error, message: err.message, gw_transaction_id: gw_transaction_id })
			}
		}else{
			// invalid customer
			createBlockUserHistory(msisdn, null, null, response.api_response, req.body.source);
			res.send({code: config.codes.code_error, message: "Not a valid Telenor number", gw_transaction_id: gw_transaction_id });
		}
	}else{
		generateOtp(res, msisdn, user, gw_transaction_id);
	}
}

createBlockUserHistory = async(msisdn, tid, mid, api_response, source) => {
	let history = {};
	history.msisdn = msisdn;
	history.operator_response = api_response;
	history.source = source ? source : 'unknown';

	if(tid){
		history.tid = tid;
		history.mid = mid;
	}

	await blockUsersRepo.createHistory(history);
}

generateOtp = async(res, msisdn, user, gw_transaction_id) => {
	if(user){
	
		// Generate OTP
		let otp = Math.floor(Math.random() * 90000) + 10000;
	
		let postBody = {otp: otp};
		postBody.msisdn = msisdn;
		let otpUser = await otpRepo.getOtp(msisdn);
	
		if(otpUser){
			// Record already present in collection, lets check it further.
			if(otpUser.verified === true){
				/* Means, this user is already verified by otp, probably he/she just wanted to 
				signin to another device from the same login, so let's update the record and 
				send newly created otp to user to verify. */
				
				postBody.verified = false;
				let record = await otpRepo.updateOtp(msisdn, postBody);
				
				if(record){
					// OTP updated successfuly in collection, let's send this otp to user by adding this otp in messaging queue
					sendMessage(record.otp, record.msisdn);
					res.send({'code': config.codes.code_success, data: 'OTP sent', gw_transaction_id: gw_transaction_id});
				}else{
					// Failed to update
					res.send({'code': config.codes.code_error, 'message': 'Failed to update OTP', gw_transaction_id: gw_transaction_id});
				}
			}else{
				// Record already present in collection without verification, send this already generated otp to user so he can verify
				sendMessage(otpUser.otp, otpUser.msisdn);
				res.send({'code': config.codes.code_success, data: 'OTP sent', gw_transaction_id: gw_transaction_id});
			}
		}else{
			// Means no user present in collection, let's create one.
			postBody.msisdn = msisdn;
			let record = await otpRepo.createOtp(postBody);
	
			if(record){
				// OTP created successfuly in collection, let's send this otp to user and acknowldge him/her
				sendMessage(record.otp, record.msisdn);
				res.send({'code': config.codes.code_success, data: 'OTP sent', gw_transaction_id: gw_transaction_id});
			}else{
				// Failed to create
				res.send({'code': config.codes.code_error, 'message': 'Failed to create OTP', gw_transaction_id: gw_transaction_id});
			}
		}
	}
}

// Validate OTP
exports.verifyOtp = async (req, res) => {
	let gw_transaction_id = req.body.transaction_id;

	let msisdn = req.body.msisdn;
	let otp = req.body.otp;
	let subscribed_package_id = req.body.package_id;
	let otpUser = await otpRepo.getOtp(msisdn);
	
	if(otpUser){
		// Record already present in collection, lets check it further.
		if(otpUser.verified === true){
			// Means, this user is already verified by otp, so let's now push an error
			res.send({code: config.codes.code_error, message: 'Already verified with this OTP', gw_transaction_id: gw_transaction_id});
		}else{
			// Let's validate this otp
			if(otpUser.otp === otp){
				// Otp verified, lets check the user's subscription

				let data = {};
				data.code = config.codes.code_otp_validated;
				data.data = 'OTP Validated!';

				await otpRepo.updateOtp(msisdn, {verified: true});
				let user = await userRepo.getUserByMsisdn(msisdn);
				
				if(user){
					let token = jwt.sign({user_id: user._id, msisdn: msisdn}, config.secret, {expiresIn: '3 days'});
					data.access_token = token;

					let subscriber = await subscriberRepo.getSubscriberByUserId(user._id);
					if(subscriber && subscribed_package_id){
						let subscription = await subscriptionRepo.getSubscriptionByPackageId(subscriber._id, subscribed_package_id);
						if(subscription){
							data.subscription_status = subscription.subscription_status;
							data.is_allowed_to_stream = subscription.is_allowed_to_stream; 
							data.user_id = user._id;
							data.subscribed_package_id = subscribed_package_id;
							data.gw_transaction_id = gw_transaction_id;
						
						}
					}
				}
				res.send(data);
			}else{
				res.send({code: config.codes.code_otp_not_validated, message: 'OTP mismatch error', gw_transaction_id: gw_transaction_id});
			}
		}
	}else{
		// Means no user present in collection, let's throw an error to user.
		res.send({code: config.codes.code_error, message: 'No OTP found to validate', gw_transaction_id: gw_transaction_id});
	}
}

// Subscribe against a package
exports.subscribe = async (req, res) => {
	let gw_transaction_id = req.body.transaction_id;

	let msisdn = req.body.msisdn;
	let user = await userRepo.getUserByMsisdn(msisdn);
	
	if(!user){
		// Means no user in DB, let's create one
		let response;
		try{
			response = await billingRepo.subscriberQuery(msisdn);
		}catch(err){
			response = err;
		}

		if(response.operator === "telenor"){
			// Let's create user. This is valid telenor user
			let userObj = {};
			userObj.msisdn = msisdn;
			userObj.operator = "telenor";

			try {
				user = await userRepo.createUser(userObj);
				console.log('Payment - Subscriber - UserCreated - ', user.msisdn, ' - ', user.source, ' - ', (new Date()));
				doSubscribe(req, res, user, gw_transaction_id);
			} catch(er) {
				res.send({code: config.codes.code_error, message: er.message, gw_transaction_id: gw_transaction_id})
			}
		}else{
			createBlockUserHistory(msisdn, req.body.affiliate_unique_transaction_id, req.body.affiliate_mid, response.api_response, req.body.source);
			res.send({code: config.codes.code_error, message: "Not a valid Telenor number.", gw_transaction_id: gw_transaction_id });
		}
	}else{
		doSubscribe(req, res, user, gw_transaction_id);
	}
}

doSubscribe = async(req, res, user, gw_transaction_id) => {

	if(user && user.active === true){
		// User available in DB
		let subscriber = await subscriberRepo.getSubscriberByUserId (user._id);

		if(!subscriber){
			// Subscriber is entering into the system for the first time
			// No subscriber found in DB, lets create new one
			var postObj = {};
			postObj.user_id = user._id;
			subscriber = await subscriberRepo.createSubscriber(postObj);
		}


		/* 
		* Subscriber created successfully
		* Let's create subscription if not already created
		*/
		
		let newPackageId = req.body.package_id;
		let packageObj = await packageRepo.getPackage({_id: newPackageId});

		let subscription = await subscriptionRepo.getSubscriptionByPackageId(subscriber._id, newPackageId);
		
		if(!subscription){
			// No subscription available, let's create one
			let subscriptionObj = {};
			subscriptionObj.subscriber_id = subscriber._id;
			subscriptionObj.subscribed_package_id = newPackageId;
			subscriptionObj.source = req.body.source ?  req.body.source : 'unknown';

			if(req.body.marketing_source){
				subscriptionObj.marketing_source = req.body.marketing_source;
			}

			if(req.body.affiliate_unique_transaction_id && req.body.affiliate_mid){
				subscriptionObj.affiliate_unique_transaction_id = req.body.affiliate_unique_transaction_id;
				subscriptionObj.affiliate_mid = req.body.affiliate_mid;
			}

			// Check if trial is allowed by the system
			if (packageObj.is_trial_allowed) {
				let nexBilling = new Date();
				subscriptionObj.next_billing_timestamp = nexBilling.setHours (nexBilling.getHours() + packageObj.trial_hours);
				subscriptionObj.subscription_status = 'trial';
				subscriptionObj.is_allowed_to_stream = true;
				subscription = await subscriptionRepo.createSubscription(subscriptionObj);

				let billingHistory = {};
				billingHistory.user_id = user._id;
				billingHistory.subscriber_id = subscriber._id;
				billingHistory.subscription_id = subscription._id;
				billingHistory.paywall_id = packageObj.paywall_id;
				billingHistory.package_id = newPackageId;
				billingHistory.transaction_id = undefined;
				billingHistory.operator_response = undefined;
				billingHistory.billing_status = 'trial';
				billingHistory.source = req.body.source;
				billingHistory.operator = "telenor";
				await billingHistoryRepo.createBillingHistory(billingHistory);
				
				let text = `Apko Goonj TV ${packageObj.trial_hours} hour free trial dey dia gaya ha. Jub chahien jaib se mobile nikalien aur ${packageObj.package_name} deikhen siraf Rs. ${packageObj.display_price_point}/d main`;
				sendTextMessage(text, user.msisdn);
				res.send({code: config.codes.code_trial_activated, message: 'Trial period activated!', gw_transaction_id: gw_transaction_id});
			}else{
				subscribePackage(subscription, packageObj);
				res.send({code: config.codes.code_in_billing_queue, message: 'In queue for billing!', gw_transaction_id: gw_transaction_id});
			}
		}else {
			// Pass subscription through following checks before pushing into queue
			await viewLogRepo.createViewLog(user._id);

			if(subscription.queued === false){
				let history = {};
				history.user_id = user._id;
				history.subscriber_id = subscriber._id;
				history.subscription_id = subscription._id;

				if(subscription.subscription_status === 'billed' || subscription.subscription_status === 'trial'){
					let currentPackageId = subscription.subscribed_package_id;
					let autoRenewal = subscription.auto_renewal;

					if(currentPackageId === newPackageId){
						
						history.source = req.body.source;
						history.package_id = newPackageId;
						history.paywall_id = packageObj.paywall_id;

						if(autoRenewal === true){
							// Already subscribed, no need to subsribed package again
							history.billing_status = "subscription-request-received-for-the-same-package";
							await billingHistoryRepo.createBillingHistory(history);
							res.send({code: config.codes.code_already_subscribed, message: 'Already subscribed', gw_transaction_id: gw_transaction_id});
						}else{
							// Same package - just switch on auto renewal so that the user can get charge automatically.
							let updated = await subscriptionRepo.updateSubscription(subscription._id, {auto_renewal: true});
							if(updated){
								history.billing_status = "subscription-request-received-after-unsub";
								
								await billingHistoryRepo.createBillingHistory(history);
								res.send({code: config.codes.code_already_subscribed, message: 'Subscribed', gw_transaction_id: gw_transaction_id});
							}else{
								res.send({code: config.codes.code_error, message: 'Error updating record!', gw_transaction_id: gw_transaction_id});
							}
						}
					}
				} else {
					/* 
					* Not already billed
					* Let's send this item in queue and update package, auto_renewal and 
					* billing date times once user successfully billed
					*/
					subscribePackage(subscription, packageObj)
					res.send({code: config.codes.code_in_billing_queue, message: 'In queue for billing!', gw_transaction_id: gw_transaction_id});
				}
			}else{
				res.send({code: config.codes.code_already_in_queue, message: 'The user is already in queue for processing.', gw_transaction_id: gw_transaction_id});
			}
		}
	}
	else {
		res.send({code: config.codes.code_error, message: 'Blocked user', gw_transaction_id: gw_transaction_id});
	}
}


exports.subscribeDirectly = async(req, res) => {
	let packgeObj = {
		grace_hours: 336,
		logos: [
		"https://content-dmd.s3.eu-central-1.amazonaws.com/TP-Content/static-content/others/tv.png"
		],
		active: true,
		_id: "QDfC",
		package_name: "Live TV Only",
		package_desc: "Rs. 8/day",
		package_duration: 24,
		price_point_pkr: 8,
		display_price_point: 8,
		partner_id: "TP-GoonjDailySub",
		added_dtm: "2020-02-19T07:03:40.413Z",
		last_modified: "2020-02-19T07:03:40.413Z",
		default: true
	}

	var subscriptionObj = {};
	subscriptionObj.msisdn = req.query.msisdn;
	subscriptionObj.packageObj = packgeObj;
	subscriptionObj.transactionId = req.query.msisdn+"_"+new Date();

	billingRepo.subscribePackage(subscriptionObj)
	.then(async (response) => {
		console.log('response-pay',response);
		res.send(response.data);
	}).catch(async (error) => {
		console.log('error-pay',error);
		res.send(error);
	});
}

exports.recharge = async (req, res) => {
	let gw_transaction_id = req.body.transaction_id;

	let user_id = req.body.uid;
	let msisdn = req.body.msisdn;
	let package_id = req.body.package_id;
	let source = req.body.source;
	
	let user = await userRepo.getUserById(user_id);
	if(user){
		if(user.msisdn === msisdn){
			// Supposing, this is verified user
			let subscriber = await subscriber.getSubscriberByUserId(user._id);
			let subscription = await subscriptionRepo.getSubscriptionByPackageId(subscriber._id, package_id);
			if(subscription && subscription.subscription_status === 'graced'){
				if(subscription.is_billable_in_this_cycle === true){
					res.send({code: config.codes.code_in_billing_queue, message: 'Already in billing process!', gw_transaction_id: gw_transaction_id});
				}else{
					// try charge attempt
					let packageObj = await packageRepo.getPackage({_id: package_id});
					if(packageObj){
						await subscriptionRepo.updateSubscription(subscription._id, {consecutive_successive_bill_counts: 0, is_manual_recharge: true});
						subscribePackage(subscription, packageObj);
						res.send({code: config.codes.code_in_billing_queue, message: 'In queue for billing!', gw_transaction_id: gw_transaction_id});
					}else{
						res.send({code: config.codes.code_error, message: 'No subscribed package found!', gw_transaction_id: gw_transaction_id});
					}
				}
			}else{
				res.send({code: config.codes.code_error, message: 'Something went wrong!', gw_transaction_id: gw_transaction_id});
			}
		}else{
			res.send({code: config.codes.code_error, message: 'User verification failed!', gw_transaction_id: gw_transaction_id});
		}	
	}else{
		res.send({code: config.codes.code_error, message: 'Invalid data provided.', gw_transaction_id: gw_transaction_id});
	}
}

// Check status
exports.status = async (req, res) => {
	let gw_transaction_id = req.body.transaction_id;
	let user = undefined;

	let msisdn = req.body.msisdn;
	let package_id = req.body.package_id;
	let user_id = req.body.user_id;

	if (user_id){
		user = await userRepo.getUserById(user_id);
	} else {
		user = await userRepo.getUserByMsisdn(msisdn);
	}

	if(user){
		let subscriber = await subscriberRepo.getSubscriberByUserId(user._id);
		if(subscriber){
			let result;
			if(package_id){
				result = await subscriptionRepo.getSubscriptionByPackageId(subscriber._id, package_id);
			}else{
				result = await subscriptionRepo.getAllSubscriptions(subscriber._id);
			}
			
			if(result){
				await viewLogRepo.createViewLog(user._id);
				res.send({code: config.codes.code_success, 
					subscribed_package_id: result.subscribed_package_id, 
					data: result, 
					gw_transaction_id: gw_transaction_id});	
			}else{
				res.send({code: config.codes.code_error, data: 'No subscriptions was found', gw_transaction_id: gw_transaction_id});	
			}
		}else{
			res.send({code: config.codes.code_error, data: 'No subscriber was found', gw_transaction_id: gw_transaction_id});	
		}
	}else{
		res.send({code: config.codes.code_error, message: 'Invalid msisdn provided.', gw_transaction_id: gw_transaction_id});
	}
}

exports.fetchStatus = async (req, res) => {
	let msisdn = req.query.msisdn;
	let package_id = req.query.package_id;

	let user = await userRepo.getUserByMsisdn(msisdn);
	if(user){
		let subscriber = await subscriberRepo.getSubscriberByUserId(user._id);
		if(subscriber){
			let result = await subscriptionRepo.getSubscriptionByPackageId(subscriber._id, package_id);
			if(result){
				await viewLogRepo.createViewLog(user._id);
				res.send({code: config.codes.code_success, 
					subscribed_package_id: result.subscribed_package_id, 
					data: result, 
					gw_transaction_id: gw_transaction_id});	
			}else{
				res.send({code: config.codes.code_error, data: 'No subscriptions was found', gw_transaction_id: gw_transaction_id});	
			}
		}else{
			res.send({code: config.codes.code_error, data: 'No subscriber was found', gw_transaction_id: gw_transaction_id});	
		}
	}else{
		res.send({code: config.codes.code_error, message: 'Invalid msisdn provided.'});
	}
}

exports.delete = async (req, res) => {
	let msisdn = req.query.msisdn;
	await subscriberRepo.removeNumberAndHistory(msisdn);
	res.send({code: config.codes.code_success, message: 'Done'});
}

// UnSubscribe
exports.unsubscribe = async (req, res) => {
	let gw_transaction_id = req.body.transaction_id;
	
	let user;
	let msisdn = req.body.msisdn;
	let user_id = req.body.user_id;
	let source = req.body.source;
	let package_id = req.body.package_id;

	if (user_id) {
		user = await userRepo.getUserById(user_id);
	}else{
		user = await userRepo.getUserByMsisdn(msisdn);
	}
	
	if(user){
		let subscriber = await subscriber.getSubscriberByUserId(user._id);
		if(subscriber){
			let subscription = await subscriptionRepo.getSubscriptionByPackageId(subscriber._id, package_id);
			if(subscription){
				let packageObj = await packageRepo.getPackage({_id: subscription.subscribed_package_id});
				let result = await subscriptionRepo.updateSubscription(subscription._id, {auto_renewal: false, consecutive_successive_bill_counts: 0});
				
				let history = {};
				history.user_id = user._id;
				history.paywall_id = packageObj.paywall_id;
				history.package_id = packageObj._id;
				history.subscriber_id = subscription.subscriber_id;
				history.subscription_id = subscription._id;
				history.billing_status = 'unsubscribe-request-recieved';
				history.source = source ? source : "na";
				history.operator = user.operator;
				result = await billingHistoryRepo.createBillingHistory(history);

				// send SMS to user
				let smsText = `Apki Goonj TV per ${packgeObj.package_name} ki subscription khatm kr di gai ha. Phr se subscribe krne k lye link par click karen https://www.goonj.pk/goonjplus/subscribe`;
				messageRepo.sendSmsToUser(smsText,user.msisdn);

				if(result){
					if(subscription.marketing_source && subscription.marketing_source !== 'none'){
						
						// This user registered from a marketer, let's put this user in gray list
						result = await subscriptionRepo.updateSubscription(subscription._id, {is_gray_listed: true});
						result = await userRepo.updateUser(msisdn, {is_gray_listed: true});
						if(result){
							res.send({code: config.codes.code_success, message: 'Successfully unsubscribed', gw_transaction_id: gw_transaction_id});	
						}
					}else{
						res.send({code: config.codes.code_success, message: 'Successfully unsubscribed', gw_transaction_id: gw_transaction_id});	
					}
				}else{
					res.send({code: config.codes.code_error, message: 'Failed to unsubscribe', gw_transaction_id: gw_transaction_id});	
				}

			}else{
				res.send({code: config.codes.code_error, message: 'No subscription found!', gw_transaction_id: gw_transaction_id});	
			}
		}else{
			res.send({code: config.codes.code_error, message: 'No subscriber found!', gw_transaction_id: gw_transaction_id});	
		}
	}else{
		res.send({code: config.codes.code_error, message: 'Invalid msisdn provided.', gw_transaction_id: gw_transaction_id});
	}
}

// Expire subscription
exports.expire = async (req, res) => {
	let msisdn = req.body.msisdn;
	let package_id = req.body.package_id;
	let source = req.body.source;

	let user = await userRepo.getUserByMsisdn(msisdn);
	if(user){
		let packageObj = await packageRepo.getPackage({_id: package_id});
		let subscriber = await subscriberRepo.getSubscriberByUserId(user._id);
		let subscription = await subscriptionRepo.getSubscriptionByPackageId(subscriber._id. package_id);
		await subscription.updateSubscription(subscription._id, {auto_renewal: false, subscription_status: 'expired', consecutive_successive_bill_counts: 0});
		
		
		let history = {};
		history.user_id = user._id;
		history.paywall_id = packageObj.paywall_id;
		history.package_id = packageObj._id;
		history.subscriber_id = subscription.subscriber_id;
		history.subscription_id = subscription._id;
		history.billing_status = 'expired';
		history.source = source ? source : "na";
		history.operator = user.operator;
		await billingHistoryRepo.createBillingHistory(history);
		
		
		
		res.send({code: config.code_success, message: 'Subscription successfully expired'});
	}else{
		res.send({code: config.codes.code_error, message: 'Invalid msisdn provided.'});
	}
}

// Helper functions
function getCurrentDate() {
    var now = new Date();
    var strDateTime = [
        [now.getFullYear(),
            AddZero(now.getMonth() + 1),
            AddZero(now.getDate())].join("-"),
        [AddZero(now.getHours()),
            AddZero(now.getMinutes())].join(":")];
    return strDateTime;
}

function AddZero(num) {
    return (num >= 0 && num < 10) ? "0" + num : num + "";
}