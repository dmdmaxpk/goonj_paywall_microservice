const config = require('../config');
const container = require("../configurations/container");
const otpRepo = require('../repos/OTPRepo');
const userRepo = container.resolve("userRepository");
const subscriberRepo = container.resolve("subscriberRepository");
const packageRepo = container.resolve("packageRepository");
const billingHistoryRepo = container.resolve("billingHistoryRepository");
const billingRepository = container.resolve("billingRepository")
const viewLogRepo = require('../repos/ViewLogRepo');
const easypaisaPaymentService = container.resolve("easypaisaPaymentService");

const shortId = require('shortid');
const messageRepo = container.resolve("messageRepository");
const blockUsersRepo = require('../repos/BlockedUsersRepo');

const subscriptionRepo = container.resolve("subscriptionRepository");
const constants = container.resolve("constants");
const paymentProcessService = container.resolve("paymentProcessService");

const authService = require('../services/AuthService');

let jwt = require('jsonwebtoken');
const { response } = require('express');
const { resolve } = require('../configurations/container');
const { use } = require('../routes');
const helper = require('../helper/helper');
const  _ = require('lodash');
const BillingRepository = require('../repos/BillingRepo');


function sendMessage(otp, msisdn){
	let message = `Use code ${otp} for Goonj TV`;
	let messageObj = {};
	messageObj.message =  message;
	messageObj.msisdn = msisdn;
	
	// Add object in queueing server
	console.log('OTP - AddedInQueue - MSISDN - ', msisdn, ' - OTP - ', otp, ' - ', (new Date()));
	if (messageObj.msisdn && messageObj.message) {
		rabbitMq.addInQueue(config.queueNames.messageDispatcher, messageObj);
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
		rabbitMq.addInQueue(config.queueNames.messageDispatcher, messageObj);
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
	console.log("Add in queueing server",subscriptionObj);
	if (subscription.queued === false && subscriptionObj.user && subscriptionObj.packageObj && subscriptionObj.packageObj.price_point_pkr && subscriptionObj.transactionId ) {
		let updated = await subscriptionRepo.updateSubscription(subscription._id, {queued: true, auto_renewal: true});
		console.log("Add in queueing server",subscriptionObj);
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

exports.paymentSources = async (req, res) => {
    let gw_transaction_id = req.body.transaction_id;
	let sources = await paymentSourceRepo.getSources();
	res.send({code: config.codes.code_success, data: sources, gw_transaction_id: gw_transaction_id })
}

// Generate OTP and save to collection
exports.sendOtp = async (req, res) => {
	let gw_transaction_id = req.body.transaction_id;
	let package_id = req.body.package_id;
	let payment_source =  req.body.payment_source; 
	let msisdn = req.body.msisdn;
	let user = await userRepo.getUserByMsisdn(msisdn);

	let response = {};
	if(payment_source && payment_source === "easypaisa"){
		response.operator = "easypaisa";
	}else{
		try{
			response = await paymentProcessService.subscriberQuery(msisdn);
			console.log("SUBSCRIBER QUERY RESPONSE - OTP", response);
		}catch(err){
			console.log("SUBSCRIBER QUERY ERROR - OTP", err);
			response = err;
		}
	}

	if(!user){
        // no user
		let userObj = {};
		userObj.msisdn = msisdn;
        userObj.subscribed_package_id = 'none';
		userObj.source = req.body.source ? req.body.source : 'na';
		if (response.operator === 'telenor' || response.operator === 'easypaisa'){
			try {
                userObj.operator = payment_source;
				user = await userRepo.createUser(userObj);
				
				if(payment_source === "telenor"){
					try {
						console.log('Payment - OTP - TP - UserCreated - ', user.msisdn, ' - ', user.source, ' - ', (new Date()));
						generateOtp(res, msisdn, user, gw_transaction_id);
					} catch (err) {
						res.send({code: config.codes.code_error, message: err.message, gw_transaction_id: gw_transaction_id })
					}
				} else if(payment_source === "easypaisa"){
					try {
						let record = await easypaisaPaymentService.bootOptScript(msisdn);
						console.log('sendOtp - ep', record);
						if (record.code === 0)
							res.send({code: config.codes.code_success, message: record.message, access_token: authService.generateAccessToken(msisdn), refresh_token: authService.generateRefreshToken(msisdn), gw_transaction_id: gw_transaction_id});
						else
							res.send({code: config.codes.code_error, message: "Failed to send OTP", gw_transaction_id: gw_transaction_id });
					}catch (e) {
						console.log('sendOtp - error', e);
						res.send({code: config.codes.code_error, message: "Failed to send OTP", gw_transaction_id: gw_transaction_id });
					}
				}
            }catch (e) {
                res.send({code: config.codes.code_error, message: 'Failed to register user', gw_transaction_id: gw_transaction_id })
            }
		}else{
            // invalid customer
            createBlockUserHistory(msisdn, null, null, response.api_response, req.body.source);
            res.send({code: config.codes.code_error, message: "Not a valid Telenor number", gw_transaction_id: gw_transaction_id });
		}
		
	}else{
		if(payment_source === 'telenor'){
			console.log('sent otp - telenor');
			generateOtp(res, msisdn, user, gw_transaction_id);
		}else if (payment_source === 'easypaisa') {

            //check EP token already exist, if yes then generate Telenor token
            console.log('Checking if EP token already exist');
            let epToken = await checkEPToken(package_id, user);
			if(epToken){
				console.log('sent otp - tp as ep-token already exist');
				await generateOtp(res, msisdn, user, gw_transaction_id);
			}else{
				console.log('sent otp - ep as no ep-token exist');
				let record = await easypaisaPaymentService.bootOptScript(msisdn);
				if (record.code === 0)
					res.send({code: config.codes.code_success, message: record.message, access_token: authService.generateAccessToken(msisdn), refresh_token: authService.generateRefreshToken(msisdn), gw_transaction_id: gw_transaction_id});
				else
					res.send({code: config.codes.code_error, message: "Failed to send OTP", gw_transaction_id: gw_transaction_id });
			}
		}
        else{
            // invalid customer
            createBlockUserHistory(msisdn, null, null, response.api_response, req.body.source);
            res.send({code: config.codes.code_error, message: "Not a valid Telenor number", gw_transaction_id: gw_transaction_id });
        }
	}
}

async function checkEPToken(package_id, user){
    let subscriber = await subscriberRepo.getSubscriberByUserId(user._id);
    if (subscriber){
        let prevSub = await subscriptionRepo.getSubscriptionByPackageId(subscriber._id, package_id);
		if (prevSub && prevSub.ep_token && (prevSub.ep_token !== undefined || prevSub.ep_token !== '')) {
            return true;
        }
	}
    return false;
}

exports.deLink = async (req, res) => {
    let gw_transaction_id = req.body.transaction_id;
	let msisdn = req.body.msisdn;
	let subscription_id = req.body.subscription_id;

	let user = "123"; //await userRepo.getUserByMsisdn(msisdn);
	let subscription = "123";// = await subscriptionRepo.getSubscription(subscription_id);

	// Means no user in DB, let's create one but first check if the coming user has valid active telenor number
	if(user && subscription){
		let response = await paymentProcessService.deLink(user, subscription);
		if(response && response.message === 'success'){
			res.send({code: config.codes.code_success, message: 'DeLinked successfully', gw_transaction_id: gw_transaction_id })
		}else{
			res.send({code: config.codes.code_error, message: 'No user exist', gw_transaction_id: gw_transaction_id })
		}
	}else{
		res.send({code: config.codes.code_error, message: 'Failed to delink', gw_transaction_id: gw_transaction_id })
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
		let otp =  Math.floor(1000 + (9999 - 1000) * Math.random());
		console.log('OTP Generated: ', otp)
	
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

	if(!subscribed_package_id){
		subscribed_package_id = config.default_package_id;
	}

	
	if(otpUser){
		// OTP hardcoded
		if(msisdn === '03485049911'){
			otpUser.verified = false;
			otpUser.otp = '1234';
		}

		// Record already present in collection, lets check it further.
		if(otpUser.verified === true){
			// Means, this user is already verified by otp, so let's now push an error
			res.send({code: config.codes.code_error, message: 'Already verified with this OTP', 
						gw_transaction_id: gw_transaction_id});
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
					data.access_token = authService.generateAccessToken(msisdn);
					data.refresh_token = authService.generateRefreshToken(msisdn);

					let subscriber = await subscriberRepo.getSubscriberByUserId(user._id);
					if(subscriber && subscribed_package_id){
						let subscription = await subscriptionRepo.getSubscriptionByPackageId(subscriber._id, subscribed_package_id);
						let subscribed_package_ids = await subscriptionRepo.getPackagesOfSubscriber(subscriber._id);
						if(subscription){
							data.subscription_status = subscription.subscription_status;
							data.is_allowed_to_stream = subscription.is_allowed_to_stream; 
							data.user_id = user._id;
							data.subscribed_package_id = subscribed_package_id;
							data.gw_transaction_id = gw_transaction_id;
							data.subscribed_packages = subscribed_package_ids;
						}
					}
				}
				res.send(data);
			} else{
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
	// billingRepository.sendMessage('Lorem Ipsum is simply dummy text of the printing. Lorem Ipsum  standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen', '03476733767')

	let gw_transaction_id = req.body.transaction_id;
	let decodedUser = req.decoded;

	if(decodedUser && decodedUser.msisdn){
		let payment_source = req.body.payment_source;
	
		let msisdn = decodedUser.msisdn;
		console.log("Decoded Msisdn: ", msisdn);
		let user = await userRepo.getUserByMsisdn(msisdn);
		if(!user){
			// Means no user in DB, let's create one
			let userObj = {}, response = {};
			userObj.msisdn = msisdn;
			userObj.operator = response.operator;
			userObj.source = req.body.source ? req.body.source : "na";
	
			if(payment_source && payment_source === "easypaisa"){
				response.operator = "easypaisa";
			}else{
				try{
					response = await paymentProcessService.subscriberQuery(msisdn);
					console.log("SUBSCRIBER QUERY RESPONSE - SUBSCRIBE", response);
				}catch(err){
					console.log("SUBSCRIBER QUERY ERROR - SUBSCRIBE", err);
					response = err;
				}
			}
	
			if(response && (response.operator === "telenor" || response.operator === "easypaisa")){
				try {
					userObj.operator = response.operator;
					user = await userRepo.createUser(userObj);
					console.log('Payment - Subscriber - UserCreated - ', response.operator, ' - ', msisdn, ' - ', user.source, ' - ', (new Date()));
	
					if(user && user.is_black_listed){
						console.log('The user is blacklisted');
						res.send({code: config.codes.code_error, message: "The user is blacklisted", gw_transaction_id: gw_transaction_id});
					}else{
						doSubscribe(req, res, user, gw_transaction_id);
					}
				} catch(er) {
					res.send({code: config.codes.code_error, message: 'Failed to subscriber user', gw_transaction_id: gw_transaction_id})
				}
			}else{
				createBlockUserHistory(msisdn, req.body.affiliate_unique_transaction_id, req.body.affiliate_mid, response ? response.api_response : "no response", req.body.source);
				res.send({code: config.codes.code_error, message: "Not a valid Telenor number.", gw_transaction_id: gw_transaction_id });
			}
		}else{
			if(user.is_black_listed){
				console.log('The user is blacklisted');
				res.send({code: config.codes.code_error, message: "The user is blacklisted", gw_transaction_id: gw_transaction_id});
			}else{
				doSubscribe(req, res, user, gw_transaction_id);
			}
		}
	}else{
		console.log('No decoded user present');
		res.send({code: config.codes.code_error, message: "Authentication Failure", gw_transaction_id: gw_transaction_id});
	}
}

doSubscribe = async(req, res, user, gw_transaction_id) => {
	if(user && user.active === true && user.is_black_listed === false){
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
		if (packageObj) {
			let subscription = await subscriptionRepo.getSubscriptionByPaywallId(subscriber._id, packageObj.paywall_id);
			if(!subscription){
				
				// No subscription available, let's create one
				let subscriptionObj = {};
				subscriptionObj.subscriber_id = subscriber._id;
				subscriptionObj.paywall_id = packageObj.paywall_id;
				subscriptionObj.subscribed_package_id = newPackageId;
				subscriptionObj.source = req.body.source ?  req.body.source : 'unknown';
				subscriptionObj.payment_source = req.body.payment_source ? req.body.payment_source : "telenor";

				// First check, if there is any other subscription of the same subscriber having payment source easypaisa and having ep token
				let alreadyEpSubscriptionsAvailable = await subscriptionRepo.getSubscriptionHavingPaymentSourceEP(subscriber._id);
				if(alreadyEpSubscriptionsAvailable){
					// already ep subscription available, let's use the same token
					// No subscription available, let's create one
					subscriptionObj.ep_token = alreadyEpSubscriptionsAvailable.ep_token;
				}

				if(req.body.marketing_source){
					subscriptionObj.marketing_source = req.body.marketing_source;
				}
	
				if(req.body.affiliate_unique_transaction_id || req.body.affiliate_mid){
					subscriptionObj.affiliate_unique_transaction_id = req.body.affiliate_unique_transaction_id;
					subscriptionObj.affiliate_mid = req.body.affiliate_mid;
					subscriptionObj.should_affiliation_callback_sent = true;
				}

				// Check if trial is allowed by the system
				let sendTrialMessage = false;
				let sendChargingMessage = false;

				
				// TODO process billing directly and create subscription
				subscriptionObj.active = true;
				subscriptionObj.amount_billed_today = 0;


				// For affiliate/gdn users and for non-affiliate/non-gdn users
				// Logic - For affiliate/gdn: daily > micro ? trial
				// Logic - For non affiliate/non-gdn: weekly > micro ? trial
				// Logic will behave as per package is coming in request for subscription 
				// As in affiliate case package will be for daily so daily > micro > trial
				// And for non, package will be weekly, so: weekly > micro > trial
				if(packageObj.paywall_id === "ghRtjhT7"){
					try{
						// No micro charge for daily affiliate subscriptions
						if(packageObj._id === 'QDfC' && (req.body.affiliate_mid === 'gdn' || req.body.affiliate_mid === 'gdn1' || req.body.affiliate_mid === 'gdn2' || req.body.affiliate_mid === 'gdn3')){
							try {
								let result = await paymentProcessService.processDirectBilling(req.body.otp? req.body.otp : undefined, user, subscriptionObj, packageObj,true);
								console.log("Direct Billing processed",result,user.msisdn);
								if(result && result.message === "success"){
									res.send({code: config.codes.code_success, message: 'User Successfully Subscribed!', gw_transaction_id: gw_transaction_id});
									sendChargingMessage = true;
								}else{
									let trial = await activateTrial(req.body.otp? req.body.otp : undefined, req.body.source, user, subscriber, packageObj, subscriptionObj);
									if(trial === "done"){
										res.send({code: config.codes.code_trial_activated, message: 'Trial period activated!', gw_transaction_id: gw_transaction_id});
										sendTrialMessage = true;
									}
								}
							} catch(err){
								console.log("Error while direct billing first time",err.message,user.msisdn);
								res.send({code: config.codes.code_error, message: 'Failed to subscribe package, please try again', gw_transaction_id: gw_transaction_id});
							}
						}else if (req.body.affiliate_mid === '1569' || req.body.affiliate_mid === 'aff3a' || req.body.affiliate_mid === 'aff3' || req.body.affiliate_mid === 'goonj' || req.body.affiliate_mid === 'tp-gdn'){
							try {
								let result = await paymentProcessService.processDirectBilling(req.body.otp? req.body.otp : undefined, user, subscriptionObj, packageObj,true);
								console.log("Direct Billing processed",result,user.msisdn);
								if(result && result.message === "success"){
									res.send({code: config.codes.code_success, message: 'User Successfully Subscribed!', gw_transaction_id: gw_transaction_id});
									sendChargingMessage = true;
								}else{
									let trial = await activateTrial(req.body.otp? req.body.otp : undefined, req.body.source, user, subscriber, packageObj, subscriptionObj);
									if(trial === "done"){
										res.send({code: config.codes.code_trial_activated, message: 'Trial period activated!', gw_transaction_id: gw_transaction_id});
										sendTrialMessage = true;
									}

									// res.send({code: config.codes.code_error, message: 'Insifficiant balance, please recharge your account and try again', gw_transaction_id: gw_transaction_id});
								}
							} catch(err){
								console.log("Error while direct billing first time",err.message,user.msisdn);
								res.send({code: config.codes.code_error, message: 'Failed to subscribe package, please try again', gw_transaction_id: gw_transaction_id});
							}
						}else{
							// Live paywall, subscription rules along with micro changing started
							let subsResponse = await doSubscribeUsingSubscribingRuleAlongWithMicroCharging(req.body.otp, req.body.source, user, subscriber, packageObj, subscriptionObj);
							if(subsResponse && subsResponse.status === "charged"){
								res.send({code: config.codes.code_success, message: 'User Successfully Subscribed!', package_id: subsResponse.subscriptionObj.subscribed_package_id, gw_transaction_id: gw_transaction_id});
								sendChargingMessage = true;
							}else if(subsResponse && subsResponse.status === "trial"){
								res.send({code: config.codes.code_trial_activated, message: 'Trial period activated!', package_id: subsResponse.subscriptionObj.subscribed_package_id, gw_transaction_id: gw_transaction_id});
								sendTrialMessage = true;
							}else{
								res.send({code: config.codes.code_error, message: 'Failed to subscribe package' + (subsResponse.desc ? ', possible cause: '+subsResponse.desc : ''), package_id: subsResponse.subscriptionObj.subscribed_package_id, gw_transaction_id: gw_transaction_id});
							}
							subscriptionObj = subsResponse.subscriptionObj;
							packageObj = await packageRepo.getPackage({_id: subscriptionObj.subscribed_package_id});
						}
					}catch(err){
						console.log("=> ", err);
						sendTrialMessage = false;
						sendChargingMessage = false;
						res.send({code: config.codes.code_error, message: 'Failed to subscribe package, please try again', gw_transaction_id: gw_transaction_id});
					}
				}else{
					// comedy paywall
					try {
						let result = await paymentProcessService.processDirectBilling(req.body.otp? req.body.otp : undefined, user, subscriptionObj, packageObj,true);
						console.log("Direct Billing processed",result,user.msisdn);
						if(result.message === "success"){
							// subscription = await subscriptionRepo.createSubscription(subscriptionObj);
							// subscribePackage(subscription, packageObj);
							res.send({code: config.codes.code_success, message: 'User Successfully Subscribed!', 
										gw_transaction_id: gw_transaction_id});
							sendChargingMessage = true;
						}else{
							res.send({code: config.codes.code_error, message: 'Failed to subscribe.', 
									gw_transaction_id: gw_transaction_id});
						}
					} catch(err){
						console.log("Error while direct billing first time",err.message,user.msisdn);
						res.send({code: config.codes.code_error, message: 'Failed to subscribe package, please try again', gw_transaction_id: gw_transaction_id});
					}
				}






				if (sendTrialMessage === true) {
					let trial_hours = packageObj.trial_hours;
					console.log("subscribed_package_id",subscriptionObj.subscribed_package_id, user.msisdn);
					console.log("source",subscriptionObj.affiliate_mid,user.msisdn);
					console.log("subscribed_package_id",constants.subscription_messages,user.msisdn);
					
					let message = constants.subscription_messages[subscriptionObj.subscribed_package_id];
					if (subscriptionObj.affiliate_mid === 'gdn'){
						message = constants.subscription_messages[subscriptionObj.affiliate_mid];
					}
					console.log("Messages",message,user.msisdn);
					text = message;
					text = text.replace("%trial_hours%",trial_hours);
					text = text.replace("%price%",packageObj.display_price_point_numeric);
					text = text.replace("%user_id%",subscriber.user_id);
					text = text.replace("%pkg_id%",packageObj._id);
					console.log("Subscription Message Text",text,user.msisdn);
					sendTextMessage(text, user.msisdn);
				} else if(sendChargingMessage === true) {
					let trial_hours = packageObj.trial_hours;
					let message = constants.subscription_messages_direct[packageObj._id];
					message= message.replace("%price%",packageObj.display_price_point)
					message= message.replace("%user_id%",subscriber.user_id)
					message= message.replace("%pkg_id%",packageObj._id)
					if(subscriptionObj.affiliate_mid === 'gdn'){
						message = constants.subscription_messages[subscriptionObj.affiliate_mid];
					}
					console.log("Messages",message, user.msisdn);
				
					console.log("Subscription Message Text", message, user.msisdn);
					sendTextMessage(message, user.msisdn);
				}else {
					console.log("Not sending message",user.msisdn);
				}
			}else {
				if(subscription.active === true){
					// Pass subscription through following checks before pushing into queue
					await viewLogRepo.createViewLog(user._id, subscription._id);
					let currentPackageId = subscription.subscribed_package_id;
					let autoRenewal = subscription.auto_renewal;

					if(subscription.queued === false){
						let history = {};
						history.user_id = user._id;
						history.subscriber_id = subscriber._id;
						history.subscription_id = subscription._id;

						// if both subscribed and upcoming packages are same
						if(currentPackageId === newPackageId){
							history.source = req.body.source;
							history.package_id = newPackageId;
							history.paywall_id = packageObj.paywall_id;

							if(subscription.subscription_status === 'billed' || subscription.subscription_status === 'trial'
										|| subscription.subscription_status === 'graced'){
								if(autoRenewal === true){
									// Already subscribed, no need to subscribed package again
									history.billing_status = "subscription-request-received-for-the-same-package";
									await billingHistoryRepo.createBillingHistory(history);
									res.send({code: config.codes.code_already_subscribed, message: 'Already subscribed', gw_transaction_id: gw_transaction_id});
								}else{
									// Same package - just switch on auto renewal so that the user can get charge automatically.
									let updated = await subscriptionRepo.updateSubscription(subscription._id, {auto_renewal: true});
									if(updated){
										history.billing_status = "subscription-request-received-after-unsub";
										
										await billingHistoryRepo.createBillingHistory(history);
										res.send({code: config.codes.code_already_subscribed, message: 'Subscribed again after unsub', gw_transaction_id: gw_transaction_id});
									}else{
										res.send({code: config.codes.code_error, message: 'Error updating record!', gw_transaction_id: gw_transaction_id});
									}
								}
								
							}else{
								/* 
								* Not already billed
								* Let's send this item in queue and update package, auto_renewal and 
								* billing date times once user successfully billed
								*/
								let nextBillingTime = new Date(subscription.next_billing_timestamp);
								let today = new Date();

								if(subscription.subscription_status === 'expired' && (nextBillingTime > today)){
									if(subscription.last_subscription_status && subscription.last_subscription_status === "trial"){
										try {
											subscription.payment_source = req.body.payment_source;
											let result = await paymentProcessService.processDirectBilling(req.body.otp? req.body.otp : undefined, user, subscription, packageObj,false);
											console.log("result",result,user.msisdn);
											if(result.message === "success"){
												res.send({code: config.codes.code_success, message: 'Subscribed Successfully', gw_transaction_id: gw_transaction_id});
											}else{
												if(result.desc){
													if(result.desc === 'Easypaisa OTP not found'){
														res.send({code: config.codes.code_otp_not_found, message: result.desc, gw_transaction_id: gw_transaction_id});
													}else{
														res.send({code: config.codes.code_error, message: 'Failed to subscribe, possible cause: '+ result.desc, gw_transaction_id: gw_transaction_id});
													}
												}
											}
										} catch(err){
											console.log(err);
											res.send({code: config.codes.code_error, message: 'Failed to subscribe, insufficient balance', gw_transaction_id: gw_transaction_id});
										}
									}else{
										await reSubscribe(subscription, history);
										let date = nextBillingTime.getDate()+"-"+(nextBillingTime.getMonth()+1)+"-"+nextBillingTime.getFullYear();
										res.send({code: config.codes.code_already_subscribed, message: 'You have already paid till '+date+'. Continue watching ', gw_transaction_id: gw_transaction_id});
									}
								}else{
									try {
										subscription.payment_source = req.body.payment_source;
										let result = await paymentProcessService.processDirectBilling(req.body.otp? req.body.otp : undefined, user, subscription, packageObj,false);
										console.log("result direct billing - ",result,user.msisdn);
										if(result.message === "success"){
											res.send({code: config.codes.code_success, message: 'Subscribed Successfully', gw_transaction_id: gw_transaction_id});
										}else{
											res.send({code: config.codes.code_error, message: 'Failed to subscribe, insufficient balance', gw_transaction_id: gw_transaction_id});
										}
									} catch(err){
										console.log(err);
										res.send({code: config.codes.code_error, message: 'Failed to subscribe, insufficient balance', gw_transaction_id: gw_transaction_id});
									}
								}
							}
						}else{
								// request is coming for the same paywall but different package
								if (subscription.subscription_status === "billed"){
									let newPackageObj = await packageRepo.getPackage({_id: newPackageId});
									let currentPackageObj = await packageRepo.getPackage({_id: currentPackageId});

									if(newPackageObj.package_duration > currentPackageObj.package_duration){
										// It means switching from daily to weekly, process billing
										try {
											let result = await paymentProcessService.processDirectBilling(req.body.otp? req.body.otp : undefined, user, subscription, packageObj,false);
											if(result && result.message === "success"){
												res.send({code: config.codes.code_success, message: 'Package successfully switched.', gw_transaction_id: gw_transaction_id});
											}else{
												res.send({code: config.codes.code_error, message: 'Failed to switch package, insufficient balance', gw_transaction_id: gw_transaction_id});
											}
										} catch(graceErr){
											console.log(graceErr);
											res.send({code: config.codes.code_error, message: 'Failed to switch package, insufficient balance', gw_transaction_id: gw_transaction_id});
										}
									}else{
										// It means, package switching from weekly to daily // Weekly to daily switch message added
										let updated = await subscriptionRepo.updateSubscription(subscription._id, {auto_renewal: true, subscribed_package_id:newPackageId});
										let nextBillingDate = new Date(updated.next_billing_timestamp);
										nextBillingDate = nextBillingDate.toLocaleDateString();
										history.paywall_id = packageObj.paywall_id;
										history.package_id = newPackageId;
										history.billing_status = "package_change_upon_user_request";
										await billingHistoryRepo.createBillingHistory(history);
										let message = constants.message_on_weekly_to_daily_switch.message;
										let text = message;
										text = text.replace("%pkg_id%",packageObj._id);
										text = text.replace("%user_id%",user._id);
										text = text.replace("%current_date%", nextBillingDate);
										text = text.replace("%next_date%", nextBillingDate);
										sendTextMessage(text, user.msisdn);
										console.log("text", text);
										res.send({code: config.codes.code_success, message: 'Package successfully switched.', gw_transaction_id: gw_transaction_id});
									}
								} else if (subscription.subscription_status === "graced" || subscription.subscription_status === "expired" || subscription.subscription_status === "trial" ) {
								try {
									let result = await paymentProcessService.processDirectBilling(req.body.otp? req.body.otp : undefined, user, subscription, packageObj,false);
									if(result.message === "success"){
										res.send({code: config.codes.code_success, message: 'Package successfully switched.', gw_transaction_id: gw_transaction_id});
									}else{
										res.send({code: config.codes.code_error, message: 'Failed to switch package, insufficient balance', gw_transaction_id: gw_transaction_id});
									}
								} catch(graceErr){
									console.log(graceErr);
									res.send({code: config.codes.code_error, message: 'Failed to switch package, insufficient balance', gw_transaction_id: gw_transaction_id});
								}
							} else {
								res.send({code: config.codes.code_error, message: 'Failed to switch package,status not present', gw_transaction_id: gw_transaction_id});
							}
						}
					}else{
						res.send({code: config.codes.code_already_in_queue, message: 'The user is already in queue for processing.', gw_transaction_id: gw_transaction_id});
					}
				}else{
					res.send({code: config.codes.code_error, message: 'This user is is not active user.', gw_transaction_id: gw_transaction_id});
				}
			}
		} else {
			res.send({code: config.codes.code_error, message: 'Package does not exist', gw_transaction_id: gw_transaction_id});
		}	
	} else {
		res.send({code: config.codes.code_error, message: 'Blocked user', gw_transaction_id: gw_transaction_id});
	}
}

activateTrial = async(otp, source, user, subscriber, packageObj, subscriptionObj) => {

	let nexBilling = new Date();
	let trial_hours = packageObj.trial_hours;
	if (subscriptionObj.source === 'daraz'){
		trial_hours = 30;
	}

	let billingHistory = {};
	if(subscriptionObj.payment_source === "easypaisa"){
		packageObj.price_point_pkr = 1;
		let response = await paymentProcessService.processDirectBilling(otp, user, subscriptionObj, packageObj, true);
		if(response.success){
			billingHistory.transaction_id = response.api_response.response.orderId;
			billingHistory.operator_response = response.api_response;
		}
	}

	// Success billing


	let serverDate = new Date();
	let localDate = helper.setDateWithTimezone(serverDate);
	let nextBilling = _.clone(localDate);
	nextBilling = nextBilling.setHours(nextBilling.getHours() + trial_hours);

	// subscriptionObj.next_billing_timestamp = nexBilling.setHours (nexBilling.getHours() + trial_hours );
	subscriptionObj.last_billing_timestamp = localDate;
	subscriptionObj.next_billing_timestamp = nextBilling;
	subscriptionObj.subscription_status = 'trial';
	subscriptionObj.is_allowed_to_stream = true;
	subscriptionObj.should_affiliation_callback_sent = false;
	let subscription = await subscriptionRepo.createSubscription(subscriptionObj);

	
	billingHistory.user_id = user._id;
	billingHistory.subscriber_id = subscriber._id;
	billingHistory.subscription_id = subscription._id;
	billingHistory.paywall_id = packageObj.paywall_id;
	billingHistory.package_id = packageObj._id;
	billingHistory.billing_status = 'trial';
	billingHistory.source = source;
	billingHistory.operator = subscriptionObj.payment_source;
	await billingHistoryRepo.createBillingHistory(billingHistory);
	await viewLogRepo.createViewLog(user._id, subscription._id);

	return "done";
}

doSubscribeUsingSubscribingRuleAlongWithMicroCharging = async(otp, source, user, subscriber, packageObj, subscriptionObj) => {
	return new Promise(async(resolve, reject) => {
		let dataToReturn = {};

		try {
			if(subscriptionObj.try_micro_charge_in_next_cycle){
				console.log("Trying micro charging for rs. ", subscriptionObj.micro_price_point);
			}else{
				console.log("Trying direct billing with mc rules for ", packageObj._id);
			}
			subscriptionObj.subscribed_package_id = packageObj._id;

			let result = await paymentProcessService.processDirectBilling(subscriptionObj.ep_token ? undefined : otp, user, subscriptionObj, packageObj, true);
			console.log("Direct billing processed with status ", result.message);
			if(result.message === "success"){
				dataToReturn.status = "charged";
				dataToReturn.subscriptionObj = subscriptionObj;
				resolve(dataToReturn);
			}else {
				/*if (result.message === "failed" && result.response.errorCode === "500.007.05") {
					dataToReturn.desc = 'Easypaisa account is not activated on this number. Please use an Easypaisa account. Thanks';
					dataToReturn.status = "failed";
                    dataToReturn.subscriptionObj = subscriptionObj;
                    resolve(dataToReturn);
                    return;
				}else*/ if(result.desc && result.desc !== 'Insufficient Balance'){
					dataToReturn.desc = result.desc;
					dataToReturn.status = "failed";
					dataToReturn.subscriptionObj = subscriptionObj;
					resolve(dataToReturn);
					return;
				}

				let pinLessTokenNumber = result.subscriptionObj.ep_token ? result.subscriptionObj.ep_token : undefined;
				if(pinLessTokenNumber){
					subscriptionObj.ep_token = pinLessTokenNumber;
				}

				let micro_price_points = packageObj.micro_price_points;
				if(micro_price_points.length > 0){
					let currentIndex = (micro_price_points.length - 1);

					if(subscriptionObj.try_micro_charge_in_next_cycle === true){
						currentIndex = micro_price_points.findIndex(x => x === subscriptionObj.micro_price_point);
						currentIndex -= 1;
					}

					if(currentIndex >= 0){
						// hit and try for micro
						packageObj.price_point_pkr = micro_price_points[currentIndex];
						subscriptionObj.try_micro_charge_in_next_cycle = true;
						subscriptionObj.micro_price_point = micro_price_points[currentIndex];
						let response = await doSubscribeUsingSubscribingRuleAlongWithMicroCharging(otp, source, user, subscriber, packageObj, subscriptionObj);
						resolve(response);
					}else{
						if(otp){
							dataToReturn.desc = "Insufficient balance, please recharge and try again.";
							dataToReturn.status = "failed";
							resolve(dataToReturn);
							return;
						}else{
							//activate trial
							console.log("activating trial after micro charging attempts are done");
							subscriptionObj.try_micro_charge_in_next_cycle = false;
							subscriptionObj.micro_price_point = 0;
							subscriptionObj.should_affiliation_callback_sent = false;
							let trial = await activateTrial(otp, source, user, subscriber, packageObj, subscriptionObj);
							if(trial === "done"){
								console.log("trial activated successfully");
								dataToReturn.status = "trial";
								dataToReturn.subscriptionObj = subscriptionObj;
								resolve(dataToReturn);
							}
						}
					}
				}
			}
		} catch(err){
			console.log("Error while direct billing", err, user.msisdn);
			dataToReturn.status = "error";
			dataToReturn.subscriptionObj = subscriptionObj;
			reject(dataToReturn);
		}
	});
}

reSubscribe = async(subscription, history) => {

	let dataToUpdate = {};
	dataToUpdate.auto_renewal = true;
	dataToUpdate.subscription_status = "billed";
	dataToUpdate.is_allowed_to_stream = true;

	let update = await subscriptionRepo.updateSubscription(subscription._id, dataToUpdate);
	if(update){
		history.billing_status = "subscription-request-received-for-the-same-package-after-unsub";
		await billingHistoryRepo.createBillingHistory(history);
	}
}

exports.recharge = async (req, res) => {
	let gw_transaction_id = req.body.transaction_id;

	let user_id = req.body.uid;
	let msisdn = req.body.msisdn;
	let package_id = req.body.package_id;
	let source = req.body.source;

	if(!package_id){
		package_id = config.default_package_id;
	}
	
	let user;
	if(user_id){
		user = await userRepo.getUserById(user_id);
	}else if(msisdn){
		user = await userRepo.getUserByMsisdn(msisdn);
	}

	if(user){
		let subscriber = await subscriberRepo.getSubscriberByUserId(user._id);
		let subscription = await subscriptionRepo.getSubscriptionByPackageId(subscriber._id, package_id);
		console.log("Subscription",subscription);
		if(subscription && subscription.subscription_status === 'graced'){
			if(subscription.is_billable_in_this_cycle === true){
				res.send({code: config.codes.code_in_billing_queue, message: 'Already in billing process!', gw_transaction_id: gw_transaction_id});
			}else{
				// try charge attempt
				let packageObj = await packageRepo.getPackage({_id: package_id});
				if(packageObj){
					await subscriptionRepo.updateSubscription(subscription._id, {consecutive_successive_bill_counts: 0, is_manual_recharge: true});
					let result = await paymentProcessService.processDirectBilling(undefined, user, subscription, packageObj, true);
					if(result.message === "success"){
						res.send({code: config.codes.code_success, message: 'Recharged successfully', gw_transaction_id: gw_transaction_id});
					}else {
						res.send({code: config.codes.code_error, message: 'Failed to recharge', gw_transaction_id: gw_transaction_id});
					
				}
			}
		}
		}else{
			res.send({code: config.codes.code_error, message: 'Invalid data provided.', gw_transaction_id: gw_transaction_id});
		}
	}
}

// Check status
exports.status = async (req, res) => {
	let gw_transaction_id = req.body.transaction_id;
	let user = undefined;

	let msisdn = req.body.msisdn;
	let package_id = req.body.package_id;
	let user_id = req.body.user_id;

	if(!package_id){
		package_id = config.default_package_id;
	}

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
			}
			
			if(result){
				await viewLogRepo.createViewLog(user._id, result._id);
				res.send({code: config.codes.code_success, 
					subscribed_package_id: result.subscribed_package_id, 
					data: {
						subscription_status: result.subscription_status,
						user_id: user._id,
						auto_renewal: result.auto_renewal,
						is_gray_listed: result.is_gray_listed,
						is_black_listed: result.is_black_listed,
						queued: result.queued,
						is_billable_in_this_cycle: false,
						is_allowed_to_stream: result.is_allowed_to_stream,
						active: result.active,
						next_billing_timestamp: result.next_billing_timestamp
					}, 
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

exports.getAllSubscriptions = async (req, res) => {
	let gw_transaction_id = req.query.transaction_id;
	let msisdn = req.query.msisdn;
	let user = await userRepo.getUserByMsisdn(msisdn);
	if(user){
		let subscriber = await subscriberRepo.getSubscriberByUserId(user._id);
		if(subscriber){
			let result = await subscriptionRepo.getAllActiveSubscriptions(subscriber._id);
			if(result && result.length > 0){
				let subscriptions = [];
				for(let i = 0; i < result.length; i++){
					let sub = {};
					sub.subscription_status = result[i].subscription_status,
					sub.subscribed_package_id = result[i].subscribed_package_id,
					sub.user_id = user._id,
					sub.auto_renewal = result[i].auto_renewal,
					sub.is_gray_listed = result[i].is_gray_listed,
					sub.is_black_listed = result[i].is_black_listed,
					sub.queued = result[i].queued,
					sub.is_allowed_to_stream = result[i].is_allowed_to_stream,
					sub.active = result[i].active,
					sub.next_billing_timestamp = result[i].next_billing_timestamp
					subscriptions.push(sub);
				}

				res.send({code: config.codes.code_success, 
					data: subscriptions,
					gw_transaction_id: gw_transaction_id});	
			}else{
				res.send({code: config.codes.code_error, data: 'No active subscription found', gw_transaction_id: gw_transaction_id});	
			}
		}else{
			res.send({code: config.codes.code_error, data: 'No subscriber was found', gw_transaction_id: gw_transaction_id});	
		}
	}else{
		res.send({code: config.codes.code_error, message: 'Invalid msisdn provided.', gw_transaction_id: gw_transaction_id});
	}
}

exports.delete = async (req, res) => {
	let msisdn = req.query.msisdn;
	let user = await userRepo.getUserByMsisdn(msisdn);
	if(user){
		let subscriber = await subscriberRepo.getSubscriberByUserId(user._id);
		if(subscriber){
			await subscriptionRepo.deleteAllSubscriptions(subscriber._id);
			await billingHistoryRepo.deleteHistoryForSubscriber(subscriber._id);
			res.send({code: config.codes.code_success, message: 'Done'});
		}else{
			res.send({code: config.codes.code_success, message: 'No subscriber found'});
		}
	}else{
		res.send({code: config.codes.code_success, message: 'No user found for this msisdn'});
	}
	
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
	}else if(msisdn){
		user = await userRepo.getUserByMsisdn(msisdn);
	}
	
	if(user){
		let subscriber = await subscriberRepo.getSubscriberByUserId(user._id);
		if(subscriber){
			let subscriptions = [];
			if(package_id){
				let subscription = await subscriptionRepo.getSubscriptionByPackageId(subscriber._id, package_id);
				subscriptions.push(subscription);
			}else{
				subscriptions = await subscriptionRepo.getAllSubscriptions(subscriber._id);
			}


			let unSubCount = 0;

			if(subscriptions.length > 0){
				for(let i = 0; i < subscriptions.length; i++){
					let subscription = subscriptions[i];

					let packageObj = await packageRepo.getPackage({_id: subscription.subscribed_package_id});
					let result = await subscriptionRepo.updateSubscription(subscription._id, 
					{
						auto_renewal: false, 
						consecutive_successive_bill_counts: 0,
						is_allowed_to_stream: false,
						is_billable_in_this_cycle: false,
						queued: false,
						try_micro_charge_in_next_cycle: false,
						micro_price_point: 0,
						last_subscription_status: subscription.subscription_status,
						subscription_status: "expired",
						priority: 0,
						amount_billed_today: 0
					});
					
					let history = {};
					history.user_id = user._id;
					history.paywall_id = packageObj.paywall_id;
					history.package_id = packageObj._id;
					history.subscriber_id = subscription.subscriber_id;
					history.subscription_id = subscription._id;
					history.billing_status = 'unsubscribe-request-received-and-expired';
					history.source = source ? source : "na";
					history.operator = user.operator;
					result = await billingHistoryRepo.createBillingHistory(history);
	
					if(result){
						if(subscription.marketing_source && subscription.marketing_source !== 'none'){
							
							// This user registered from a marketer, let's put this user in gray list
							result = await subscriptionRepo.updateSubscription(subscription._id, {is_gray_listed: true});
							result = await userRepo.updateUser(msisdn, {is_gray_listed: true});
							if(result){
								unSubCount += 1;
							}
						}else{
							unSubCount += 1;
						}
					}
				}

				if(unSubCount === subscriptions.length){
					// send sms
					let smsText;
					if(package_id == 'QDfG'){
						smsText = `Apki Goonj TV per Live TV Weekly ki subscription khatm kr di gai ha. Phr se subscribe krne k lye link par click karen https://www.goonj.pk`;
					}
					else if(package_id == 'QDfC'){
						smsText = `Moaziz saarif, ap ki Goonj Daily ki service khatam kar de gae hai. Dobara Rs.5+tax/day subscribe krny k liye link per click karain https://www.goonj.pk`
					}
					messageRepo.sendSmsToUser(smsText,user.msisdn);

					res.send({code: config.codes.code_success, message: 'Successfully unsubscribed', gw_transaction_id: gw_transaction_id});
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
		res.send({code: config.codes.code_error, message: 'Invalid user/msisdn provided.', gw_transaction_id: gw_transaction_id});
	}
}

// Expire subscription
exports.expire = async (req, res) => {
	let msisdn = req.body.msisdn;
	let package_id = req.body.package_id;
	let source = req.body.source;

	if(!package_id){
		package_id = config.default_package_id;
	}

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

exports.linkTransaction = async (req, res) => {
	let msisdn = req.body.msisdn;
	let otp = req.body.otp;
	let amount = req.body.amount;
	let gw_transaction_id = req.body.transaction_id;
	let subscription_id = req.body.subscription_id;

	try {
		let ep_token = await paymentProcessService.linkTransaction(msisdn, amount, otp);
		console.log('ep_token: ', ep_token);
		if (ep_token !== undefined) {
			let subRecord = await subscriptionRepo.getSubscription(subscription_id);
            console.log('subRecord: ', subRecord);

            subRecord.payment_source = 'easypaisa';
			subRecord.ep_token = ep_token;
			let result = await subscriptionRepo.updateSubscription(subscription_id, subRecord);
            console.log('result: ', result);
            if (result === undefined){
                let updateBillingResp = updateBillingHistory(msisdn, subRecord, subRecord.payment_source);
                if (updateBillingResp)
					res.send({code: config.codes.code_success, message: 'Payment source updated successfully', gw_transaction_id: gw_transaction_id});
                else
                    res.send({code: config.codes.code_success, message: 'Payment source updated successfully. But Billing History could not updated successfully.', gw_transaction_id: gw_transaction_id});
			}else
				res.send({code: config.codes.code_error, message: 'Failed to updated payment source.', gw_transaction_id: gw_transaction_id});
		} else
            res.send({code: config.codes.code_error, message: 'Failed to updated payment source.', gw_transaction_id: gw_transaction_id});
    } catch (e) {
        res.send({code: config.codes.code_error, message: 'Failed to updated payment source.', gw_transaction_id: gw_transaction_id});
    }
};

exports.updateBillingHistory = async (msisdn, subscription, source) => {
    // Add history record
    console.log("Adding history record: ", msisdn);
    try {
    	let toSource = source === 'easypaisa' ? 'telenor' : source;
        let user = await userRepo.getUserByMsisdn(msisdn);
        if (!user){
            let history = {};
            history.user_id = user._id;
            history.subscription_id =  subscription._id ;
            history.subscriber_id = subscription.subscriber_id;
            history.paywall_id = subscription.paywall_id;
            history.package_id = subscription.subscribed_package_id;
            history.billing_status = "payment-source-switched-from-"+source+"-to-"+toSource;
            history.operator = source;
            await this.billingHistoryRepo.createBillingHistory(history);

            return true;
		}
    } catch (e) {
        return false;
    }
};


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