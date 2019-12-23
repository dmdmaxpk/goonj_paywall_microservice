const config = require('../config');
const otpRepo = require('../repos/OTPRepo');
const userRepo = require('../repos/UserRepo');
const subscriberRepo = require('../repos/SubscriberRepo');
const packageRepo = require('../repos/PackageRepo');
const shortId = require('shortid');

function sendMessage(otp, msisdn){
	let message = `Use code ${otp} for Goonj+`;
	let messageObj = {};
	messageObj.message =  message;
	messageObj.msisdn = msisdn;
	
	// Add object in queueing server
	console.log('OTP - AddedInQueue - MSISDN - ', msisdn, ' - OTP - ', otp, ' - ', (new Date()));
	rabbitMq.addInQueue(config.queueNames.messageDispathcer, messageObj);
}

subscribePackage = async(user, packageObj) => {

	// Fetch user is not already available
	if(!packageObj){
		packageObj = await packageRepo.getPackage(user.subscribed_package_id);
	}

	let msisdn = user.msisdn;
	let transactionId = "Goonj_"+msisdn+"_"+packageObj._id+"_"+shortId.generate()+"_"+getCurrentDate();
	let subscriptionObj = {};
	subscriptionObj.user_id = user._id;
	subscriptionObj.msisdn = msisdn;
	subscriptionObj.packageObj = packageObj;
	subscriptionObj.transactionId = transactionId;

	// Add object in queueing server
	rabbitMq.addInQueue(config.queueNames.subscriptionDispatcher, subscriptionObj);
	console.log('Payment - SubscribePackage - AddInQueue - ', msisdn, ' - ', (new Date()));
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
		
		user = await userRepo.createUser(userObj);
		if(user){
			console.log('Payment - OTP - UserCreated - ', user.msisdn, ' - ', user.source, ' - ', (new Date()));
		}
	}else{
		console.log('User Found');
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
							res.send({code: config.codes.code_otp_validated, data: 'OTP Validated!', subscriber: subscriber.subscription_status});
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
		userObj.subscribed_package_id = 'none';
		userObj.source = req.body.source ?  req.body.source : 'unknown';
		
		user = await userRepo.createUser(userObj);
		if(user){
			console.log('Payment - Subscriber - UserCreated - ', user.msisdn, ' - ', user.source, ' - ', (new Date()));
		}
	}else{
		console.log('User Found');
	}

	if(user){
		// User available in DB
		let subscriber = await subscriberRepo.getSubscriber(user._id);
		if(subscriber){
			// Subscriber already present in DB, let's check his/her subscription status
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
			}else{
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
			}
		}else{
			// No subscriber found in DB, lets create new one
			var postObj = {};
			postObj.user_id = user._id;
			postObj.subscription_status = 'none';

			let subscriber = await subscriberRepo.createSubscriber(postObj);
			if(subscriber){
				console.log('Payment - SubscriberCreated - ', subscriber.user_id, ' - ', (new Date()));
				/* 
				* Subscriber created successfully
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
	for(i = 0; i < req.query.limit; i++){
		user.msisdn = '03476733767';
		user._id = 'o2TYH_xC';
		subscribePackage(user);
	}
	res.send('Done');
}

// Check status
exports.status = async (req, res) => {
	let msisdn = req.body.msisdn;
	let user = await userRepo.getUserByMsisdn(msisdn);
	if(user){
		let result = await subscriberRepo.getSubscriber(user._id);
		if(result){
			res.send({code: config.codes.code_success, data: result});	
		}
	}else{
		res.send({code: config.codes.code_error, message: 'Invalid msisdn provided.'});
	}
}

// UnSubscribe
exports.unsubscribe = async (req, res) => {
	let msisdn = req.body.msisdn;
	let user = await userRepo.getUserByMsisdn(msisdn);
	if(user){
		let result = await subscriberRepo.updateSubscriber(user._id, {auto_renewal: false, consecutive_successive_bill_counts: 0});
		if(result){
			res.send({code: config.code_success, message: 'Successfully unsubscribed'});	
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