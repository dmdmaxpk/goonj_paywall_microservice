const config = require('../config');
const otpRepo = require('../repos/OTPRepo');
const userRepo = require('../repos/UserRepo');
const subscriberRepo = require('../repos/SubscriberRepo');
const packageRepo = require('../repos/PackageRepo');
const billingHistoryRepo = require('../repos/BillingHistoryRepo');
const viewLogRepo = require('../repos/ViewLogRepo');
const billingRepo = require('../repos/BillingRepo');
const shortId = require('shortid');
const axios = require('axios')

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

function sendCallBackToIdeation(mid,tid){
	return new Promise(function(resolve, reject) {
        axios({
            method: 'post',
            url: config.ideation_callback_url + `p?mid=${mid}&tid=${tid}`,
            headers: {'Content-Type': 'application/x-www-form-urlencoded' }
        }).then(function(response){
            resolve(response.data);
        }).catch(function(err){
            reject(err);
        });
    });
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

subscribePackage = async(user, packageObj) => {

	// Fetch user if not already available
	if(!packageObj){
		packageObj = await packageRepo.getPackage({_id: user.subscribed_package_id});
	}

	// Fetch subscriber
	let subscriber = await subscriberRepo.getSubscriber(user._id);

	let msisdn = user.msisdn;
	let transactionId = "Goonj_"+msisdn+"_"+packageObj._id+"_"+shortId.generate()+"_"+getCurrentDate();
	let subscriptionObj = {};
	subscriptionObj.user_id = user._id;
	subscriptionObj.msisdn = msisdn;
	subscriptionObj.packageObj = packageObj;
	subscriptionObj.transactionId = transactionId;

	// Add object in queueing server
	if (subscriber.queued === false && subscriptionObj.msisdn && subscriptionObj.packageObj && subscriptionObj.packageObj.price_point_pkr && subscriptionObj.transactionId ) {
		let updated = await subscriberRepo.updateSubscriber(user._id, {queued: true});
		if(updated){
			rabbitMq.addInQueue(config.queueNames.subscriptionDispatcher, subscriptionObj);
			console.log('Payment - SubscribePackage - AddInQueue - ', msisdn, ' - ', (new Date()));
		}else{
			console.log('Failed to updated subscriber after adding in queue.');
		}
	} else {
		console.log( 'Could not add in Subscription Queue because critical parameters are missing ', subscriptionObj.msisdn ,
		subscriptionObj.packageObj.price_point_pkr,subscriptionObj.transactionId, msisdn, ' - ', (new Date()) );
	}
}


// Generate OTP and save to collection
exports.sendOtp = async (req, res) => {
	let msisdn = req.body.msisdn;
	let user = await userRepo.getUserByMsisdn(msisdn);
	
	if(!user){
		// Means no user in DB, let's create one
		let userObj = {};
		userObj.msisdn = msisdn;
		userObj.subscribed_package_id = 'none';
		userObj.source = req.body.source ? req.body.source : 'unknown';
		userObj.operator = 'telenor';
		userObj.subscription_status = 'none';

		if(req.body.marketing_source){
			userObj.marketing_source = req.body.marketing_source;
		}

		try {
			user = await userRepo.createUser(userObj);
		} catch (err) {
			res.send({code: config.codes.code_error, message: err.message })
		}
		if(user){
			console.log('Payment - OTP - UserCreated - ', user.msisdn, ' - ', user.source, ' - ', (new Date()));
		}
	}

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
				res.send({'code': config.codes.code_success, data: 'OTP sent'});
			}else{
				// Failed to update
				res.send({'code': config.codes.code_error, 'message': 'Failed to update OTP'});
			}
		}else{
			// Record already present in collection without verification, send this already generated otp to user so he can verify
			sendMessage(otpUser.otp, otpUser.msisdn);
			res.send({'code': config.codes.code_success, data: 'OTP sent'});
		}
	}else{
		// Means no user present in collection, let's create one.
		postBody.msisdn = msisdn;
		let record = await otpRepo.createOtp(postBody);

		if(record){
			// OTP created successfuly in collection, let's send this otp to user and acknowldge him/her
			sendMessage(record.otp, record.msisdn);
			res.send({'code': config.codes.code_success, data: 'OTP sent'});
		}else{
			// Failed to create
			res.send({'code': config.codes.code_error, 'message': 'Failed to create OTP'});
		}
	}
}

// Validate OTP
exports.verifyOtp = async (req, res) => {
	let msisdn = req.body.msisdn;
	let otp = req.body.otp;
	let otpUser = await otpRepo.getOtp(msisdn);
	
	if(otpUser){
		// Record already present in collection, lets check it further.
		if(otpUser.verified === true){
			// Means, this user is already verified by otp, so let's now push an error
			res.send({code: config.codes.code_error, message: 'Already verified with this OTP'});
		}else{
			// Let's validate this otp
			if(otpUser.otp === otp){
				// Otp verified, lets check the user's subscription
				let verified = await otpRepo.updateOtp(msisdn, {verified: true});
				if(verified){
					let user = await userRepo.getUserByMsisdn(msisdn);
					if(user){
						let subscriber = await subscriberRepo.getSubscriber(user._id);
						if(subscriber){
							// Subscriber is available and having active subscription
							res.send({code: config.codes.code_otp_validated, data: 'OTP Validated!', subscriber: subscriber.subscription_status, user_id: subscriber.user_id, subscribed_package_id: user.subscribed_package_id});
						}else{
							res.send({code: config.codes.code_otp_validated, data: 'OTP Validated!'});
						}
					}else{
						res.send({code: config.codes.code_error, data: 'User not found!'});
					}
				}else{
					res.send({code: config.codes.code_error, data: 'Failed to validate!'});
				}
			}else{
				res.send({code: config.codes.code_otp_not_validated, message: 'OTP mismatch error'});
			}
		}
	}else{
		// Means no user present in collection, let's throw an error to user.
		res.send({code: config.codes.code_error, message: 'No OTP found to validate'});
	}
}

// Subscribe against a package
exports.subscribe = async (req, res) => {
	let msisdn = req.body.msisdn;
	let user = await userRepo.getUserByMsisdn(msisdn);
	
	if(!user){
		// Means no user in DB, let's create one
		let userObj = {};
		userObj.msisdn = msisdn;
		userObj.subscribed_package_id = req.body.package_id;
		userObj.source = req.body.source ?  req.body.source : 'unknown';
		userObj.operator = 'telenor';
		userObj.subscription_status = 'none';
		userObj.affiliate_unique_transaction_id = req.body.affiliate_unique_transaction_id;
		userObj.affiliate_mid = req.body.affiliate_mid;

		if(req.body.marketing_source){
			userObj.marketing_source = req.body.marketing_source;
		}

		try {
			user = await userRepo.createUser(userObj);
		} catch(er) {
			res.send({code: config.codes.code_error, message: er.message})
		}
		if(user){
			console.log('Payment - Subscriber - UserCreated - ', user.msisdn, ' - ', user.source, ' - ', (new Date()));
		}
	}

	if(user){
		// User available in DB
		let subscriber = await subscriberRepo.getSubscriber(user._id);
		if(subscriber){
			// User is already present in the system 
			// user could be returning after unsubscribing
			// or after clearing cache

			// Subscriber already present in DB, let's check his/her subscription status

			// creating viewLog meaning that user has seen the app
			await viewLogRepo.createViewLog(user._id);
			if(subscriber.subscription_status === 'billed'){
				// User is already billed
				
				let currentPackageId = user.subscribed_package_id;
				let newPackageId = req.body.package_id;
				let autoRenewal = subscriber.auto_renewal;
				
				if(currentPackageId === newPackageId){
					if(autoRenewal === true){
						// Already subscribed, no need to subsribed package again
						res.send({code: config.codes.code_already_subscribed, message: 'Already subscribed'});
					}else{
						// Same, package - just switch on auto renewal so that the user can get charge automatically.
						let updated = subscriberRepo.updateSubscriber(user._id, {auto_renewal: true});
						if(updated){
							res.send({code: config.codes.code_already_subscribed, message: 'Subscribed'});
						}else{
							res.send({code: config.codes.code_error, message: 'Error updating record!'});
						}
					}
				}else{
					/* 
					 * Let's send this item in queue and update package, auto_renewal and 
					 * billing date times once user successfully billed
					 */
					let newPackageId = req.body.package_id;
					let packageObj = await packageRepo.getPackage({_id: newPackageId});
					if(packageObj){
						subscribePackage(user, packageObj)
						res.send({code: config.codes.code_in_billing_queue, message: 'In queue for billing!'});
					}else{
						res.send({code: config.codes.code_error, message: 'Wrong package id'});
					}
				}
			} else if (subscriber.subscription_status === 'expired'){
				/* 
				* Not already billed
				* Let's send this item in queue and update package, auto_renewal and 
				* billing date times once user successfully billed
				*/
				let newPackageId = req.body.package_id;
				let packageObj = await packageRepo.getPackage({_id: newPackageId});
				if(packageObj){
					subscribePackage(user, packageObj)
					res.send({code: config.codes.code_in_billing_queue, message: 'In queue for billing!'});
				}else{
					res.send({code: config.codes.code_error, message: 'Wrong package id'});
				}
			} else if (subscriber.subscription_status === 'trial'){
				let autoRenewal = subscriber.auto_renewal;
				if(autoRenewal === true){
					res.send({code: config.codes.code_trial_activated, message: 'Trial is already activated!'});
				}else{
					let updated = subscriberRepo.updateSubscriber(user._id, {auto_renewal: true});
					if(updated){
						res.send({code: config.codes.code_trial_activated, message: 'Trial updated!'});
					}else{
						res.send({code: config.codes.code_error, message: 'Error updating record!'});
					}
				}
			} else  {
				res.send({code: config.codes.code_trial_activated, subcription_status: subscriber.subscription_status});
			}
		} else{
			// User is entering into the system for the first time
			// No subscriber found in DB, lets create new one
			var postObj = {};
			postObj.user_id = user._id;
			postObj.subscription_status = 'none';
			if (config.is_trial_active) {
				let nexBilling = new Date();
				postObj.next_billing_timestamp = nexBilling.setHours ( nexBilling.getHours() + config.trial_hours);
				postObj.subscription_status = 'trial';
			}

			await userRepo.updateUserById(user._id, {subscription_status: postObj.subscription_status});
			let subscriber = await subscriberRepo.createSubscriber(postObj);
			if(subscriber){
				/* 
				* Subscriber created successfully
				* Let's send this item in queue and update package, auto_renewal and 
				* billing date times once user successfully billed
				*/
				// send callback to ideation
				if(user.source === "HE" && user.affiliate_unique_transaction_id
					&& user.affiliate_mid ) {
						// send callback to ideation with tid and mid
						// console.log(`Sending Affiliate - Marketing - Callback TID ${user.affiliate_unique_transaction_id}
						// 			- MID ${user.affiliate_mid}`);
						// try {
						// 	await sendCallBackToIdeation(user.affiliate_mid,user.affiliate_unique_transaction_id);
						// 	console.log(`Sent - Marketing - Callback TID ${user.affiliate_unique_transaction_id}
						// 			- MID ${user.affiliate_mid}`);
						// } catch(err) {
						// 	console.log("Affiliate - Marketing - Callback - Error",err);
						// }
					}
				//-------------------------
				let newPackageId = req.body.package_id;
				let packageObj = await packageRepo.getPackage({_id: newPackageId});
				if(packageObj){
					let userUpdated = await userRepo.updateUserById(user._id, {subscribed_package_id: newPackageId});
					if (config.is_trial_active) {
						let billingHistory = {};
						billingHistory.user_id = userUpdated._id;
						billingHistory.package_id = packageObj._id;
						billingHistory.transaction_id = undefined;
						billingHistory.operator_response = undefined;
						billingHistory.billing_status = 'trial';
						billingHistory.source = req.body.source;
						billingHistory.operator = 'telenor';
						await billingHistoryRepo.createBillingHistory(billingHistory);
						let text= `Goonj TV 24 hour free trial started.Pehla charge kal mobile balance sei @ Rs8/daily hoga. To unsub https://www.goonj.pk/goonjplus/unsubscribe?uid=${userUpdated._id}`;
						sendTextMessage(text,userUpdated.msisdn);
						res.send({code: config.codes.code_trial_activated, message: 'Trial period activated!'});
					} else {
						subscribePackage(user, packageObj);
						res.send({code: config.codes.code_in_billing_queue, message: 'In queue for billing!'});
					}
				}else{
					res.send({code: config.codes.code_error, message: 'Wrong package id'});
				}
			}else{
				res.send({code: config.codes.code_error, message: 'Failed to create subscriber'});
			}
		}
	}
}

exports.sendBulkMessage = async(req, res) => {
	for(i = 0; i < req.query.limit; i++){
		sendMessage(`${Math.random()}-${i}`, '03476733767');
	}
	res.send('Done');
}

exports.sendBulkSub = async(req, res) => {
	let user = {};
	console.log("Reached",'sendBulkSub',req.query.limit);
	let packgeObj = {
		grace_hours: 24,
		active: true,
		_id: "QDfC",
		package_name: "Daily Package",
		package_desc: "Subscribe daily pakage at price Rs. 8/day",
		package_duration: 24,
		price_point_pkr: 1,
		added_dtm: "2020-01-14T10:12:43.003Z"
		}

	for(i = 0; i < req.query.limit; i++){
		user.msisdn = req.query.number;
		user._id = req.query.user_id;
		user.subscribed_package_id = packgeObj._id;
		subscribePackage(user, packgeObj);
	}
	res.send('Done');
}


exports.subscribeDirectly = async(req, res) => {
	
	let packgeObj = {
		grace_hours: 24,
		active: true,
		_id: "QDfC",
		package_name: "Daily Package",
		package_desc: "Subscribe daily pakage at price Rs. 8/day",
		package_duration: 24,
		price_point_pkr: 1,
		added_dtm: "2020-01-14T10:12:43.003Z"
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

// Check status
exports.status = async (req, res) => {
	let msisdn = req.body.msisdn;
	let user = await userRepo.getUserByMsisdn(msisdn);
	if(user){
		let result = await subscriberRepo.getSubscriber(user._id);
		if(result){
			await viewLogRepo.createViewLog(user._id);
			res.send({code: config.codes.code_success, data: result});	
		}else{
			res.send({code: config.codes.code_error, data: 'No subscriber found.'});	
		}
	}else{
		res.send({code: config.codes.code_error, message: 'Invalid msisdn provided.'});
	}
}

// UnSubscribe
exports.unsubscribe = async (req, res) => {
	let msisdn = req.body.msisdn;
	let user_id = req.body.user_id;
	let user = await userRepo.getUserByMsisdn(msisdn);
	if (user_id) {
		user = await userRepo.getUserById(user_id);
	}
	
	if(user){
		let result = await subscriberRepo.updateSubscriber(user._id, {auto_renewal: false});
		
		let billingHistory = {};
		billingHistory.user_id = user._id;
		billingHistory.package_id = user.subscribed_package_id;
		billingHistory.transaction_id = undefined;
		billingHistory.operator_response = undefined;
		billingHistory.billing_status = 'unsubscribe-request-recieved';
		billingHistory.source = user.source;
		billingHistory.operator = 'telenor';
		result = await billingHistoryRepo.createBillingHistory(billingHistory);
		if(result){
			if(user.marketing_source && user.marketing_source !== 'none'){
				// This user registered from a marketer, let's put this user in gray list
				result = await userRepo.updateUser(msisdn, {is_gray_listed: true});
				if(result){
					res.send({code: config.codes.code_success, message: 'Successfully unsubscribed'});	
				}
			}else{
				res.send({code: config.codes.code_success, message: 'Successfully unsubscribed'});	
			}
		}else{
			res.send({code: config.codes.code_error, message: 'Failed to unsubscribe'});	
		}
	}else{
		res.send({code: config.codes.code_error, message: 'Invalid msisdn provided.'});
	}
}

// Expire subscription
exports.expire = async (req, res) => {
	let msisdn = req.body.msisdn;
	let user = await userRepo.getUserByMsisdn(msisdn);
	if(user){
		await userRepo.updateUser(msisdn, {subscription_status: 'expired'});
		let result = await subscriberRepo.updateSubscriber(user._id, {auto_renewal: false, subscription_status: 'expired', consecutive_successive_bill_counts: 0});
		if(result){
			res.send({code: config.code_success, message: 'Subscription successfully expired'});	
		}
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