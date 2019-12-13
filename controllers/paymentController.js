const config = require('../config');
const otpRepo = require('../repos/OTPRepo');
const userRepo = require('../repos/UserRepo');
const subscriberRepo = require('../repos/SubscriberRepo');

function sendMessage(otp, msisdn){
	let message = `Use code ${otp} for Goonj+`;
	var obj = {};
	obj.message =  message;
	obj.msisdn = msisdn;
	
	rabbitMq.sendMessage(config.queueNames.messageDispathcer, obj);
}

// Generate OTP and save to collection
exports.sendOtp = async (req, res) => {
	let msisdn = req.body.msisdn;

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
			res.send({code: config.codes.code_error, message: 'No OTP found to validate'});
		}else{
			// Let's validate this otp
			if(otpUser.otp === otp){
				// Otp verified, lets check the user's subscription
				let subscriber = subscriberRepo.getSubscriber(msisdn);
				if(subscriber){
					// Subscriber is available and having active subscription
					res.send({code: config.codes.code_otp_validated, data: 'OTP Validated!', subscriber: subscriber.subscription_status});
				}else{
					res.send({code: config.codes.code_otp_validated, data: 'OTP Validated!'});
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
	let user = await userRepo.getUser(msisdn);
	
	if(!user){
		// Means no user in DB, let's create one
		let userObj = {};
		userObj.msisdn = msisdn;
		userObj.source = req.body.source
		
		user = await userRepo.createUser(userObj);
	}

	if(user){
		// User available in DB
		let subscriber = await subscriberRepo.getSubscriber(msisdn);
		if(subscriber){
			// Subscriber already present in DB, let's check his/her subscription status
			if(subscriber.subscription_status === 'billed'){
				// User is billed
				let updated;
				var updateObj = {};
				updateObj.auto_renewal = true;
				
				let currentPackage = subscriber.package;
				let newPackage = req.body.package;
				let autoRenewal = subscriber.auto_renewal;

				if(currentPackage === newPackage){
					if(autoRenewal === true){
						// Already subscribed, no need to subsribed package again
						res.send({code: config.codes.code_already_subscribed, message: 'Already subscribed'});
						return;
					}
				}
			
				updated = await subscriberRepo.updateSubscriber(msisdn, updateObj);
				if(updated){
					// Subscription updated, let's send this item in queue and update package and billing date times once user successfully billed
					res.send({code: config.codes.code_in_billing_queue, message: 'In queue for billing!'});
				}else{
					res.send({code: config.codes.code_error, message: 'Failed to update subscriber'});
				}
			}else{
				// Not billed
				let updated;
				var updateObj = {};
				updateObj.auto_renewal = true;
				
				updated = await subscriberRepo.updateSubscriber(msisdn, updateObj);
				if(updated){
					// Subscriber updated, let's send this item in queue and update package and billing date times once user successfully billed
					res.send({code: config.codes.code_in_billing_queue, message: 'In queue for billing!'});
				}else{
					res.send({code: config.codes.code_error, message: 'Failed to update subscriber'});
				}
			}
		}else{
			// No subscriber found in DB, lets create new one
			var postObj = {};
			postObj.msisdn = msisdn;
			postObj.package = req.body.package;
			postObj.plarform = req.body.platform;
			postObj.operator = 'telenor';
			postObj.userid = user._id;
			postObj.package = 'none';

			let created = await subscriberRepo.createSubscriber(postObj);
			if(created){
				// Subscriber created in db, let's put record in queue as well for package subscription and update package and billing date times once user successfully billed
				res.send({code: config.codes.code_in_billing_queue, message: 'In queue for billing!'});
			}else{
				res.send({code: config.codes.code_error, message: 'Failed to create subscriber'});
			}
		}
	}
}