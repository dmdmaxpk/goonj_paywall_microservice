const config = require('../config');
const container = require("../configurations/container");
const repo = container.resolve("userRepository");
const packageRepo = container.resolve("packageRepository");
let billingHistoryRepo = container.resolve("billingHistoryRepository");
let subscriberRepo = container.resolve("subscriberRepository");
let subscriptionRepository = container.resolve("subscriptionRepository");
const userProfileService = require('../services/UserProfileService');
// CREATE
exports.post = async (req, res) => {
	let postData = req.body;
	
	// checking if there's already any user available with this email/username/msisdn
	let record = await repo.getUserByMsisdn(postData.msisdn);
	if(record){
		res.send({code: config.codes.code_record_already_added, 'message': 'User already exists'});
	}else{
		// Saving document
		let result = await repo.createUser(postData);
		res.send({code: config.codes.code_record_added, data: result});
	}
}

// GET
exports.get = async (req, res) => {
	let { msisdn,user_id } = req.query;
	if (msisdn || user_id) {
		let result = undefined ;
		if (msisdn) {
			result = await repo.getUserByMsisdn(msisdn);
		} else {
			result = await repo.getUserById(user_id);
		}
		if(result){
			res.send({code: config.codes.code_success, data: {fullname: result.fullname,email: result.email, dateOfBirth: result.dateOfBirth,msisdn: result.msisdn, gender: result.gender, profilePicture: result.profilePicture } });
		}else{
			res.send({code: config.codes.code_data_not_found, message: 'Data not found'});
		}
	}
	else{
		res.send({code: config.codes.code_invalid_data_provided, message: 'Invalid msisdn'});
	}
}

// GET
exports.isgraylisted = async (req, res) => {
	let gw_transaction_id = req.query.transaction_id;
	let package_id = req.query.package_id;
	let { msisdn  } = req.params;
	if (msisdn) {
		user = await repo.getUserByMsisdn(msisdn);
		if(user){
			let subscriber = await subscriberRepo.getSubscriberByUserId(user._id);
			if (subscriber) {
				let result;
				if(package_id){
					result = await subscriptionRepository.getSubscriptionByPackageId(subscriber._id, package_id);
				}
				
				if (result) {
					res.send({code: config.codes.code_success, subscription_status: result.subscription_status,
						is_gray_listed: result.is_gray_listed, gw_transaction_id: gw_transaction_id});
				} else {
					res.send({code: config.codes.code_data_not_found, message: 'Data not found',
			 			gw_transaction_id: gw_transaction_id});	
				}
			} else {
				res.send({code: config.codes.code_data_not_found, message: 'Data not found',
			 		gw_transaction_id: gw_transaction_id});	
			}
		}else{
			res.send({code: config.codes.code_data_not_found, message: 'Data not found',
			 gw_transaction_id: gw_transaction_id});
		}
	}
	else{
		res.send({code: config.codes.code_invalid_data_provided, message: 'Invalid msisdn', gw_transaction_id: gw_transaction_id});
	}
}

exports.markBlackListed = async (req, res) => {
	let msisdn = req.body.msisdn;
	let user = await repo.getUserByMsisdn(msisdn);
	if(user){
		if(!user.is_black_listed){
			try{
				let result = await repo.updateUser(msisdn, {is_black_listed:true});
				if(result){
					await repo.updateUser(msisdn, {is_black_listed:true});
					res.send({'code': config.codes.code_success, data: 'Successfully Blacklisted'});
				}else{
					res.send({'code': config.codes.code_error, data: 'Failed to black-list this user'});
				}
			}catch(e){
				res.send({'code': config.codes.code_error, data: 'Failed to black-list this user'});
			}
		}else{
			res.send({'code': config.codes.code_error, data: 'This user is already black-listed'});
		}
	}else{
		res.send({'code': config.codes.code_data_not_found, data: 'No user found against this msisdn'});
	}
}

// UPDATE
exports.put = async (req, res) => {
	let result = undefined ;
	let profilePicture = req.files ? await userProfileService.uploadPpToS3(req.files.file, req.query.user_id) : '';
	console.log("profile picture", profilePicture)
		let updatePayload= {
			fullname: req.body.fullname,
			email: req.body.email,
			dateOfBirth: req.body.dateOfBirth,
			gender: req.body.gender,
			profilePicture: profilePicture
		}
		if (!req.query.user_id)
			result = await repo.updateUser(req.query.msisdn, updatePayload);
		else
			result = await repo.updateUserById(req.query.user_id, updatePayload)

		if (result)
			res.send({'code': config.codes.code_record_updated, data : {fullname: result.fullname, email: result.email, dateOfBirth: result.dateOfBirth,msisdn: result.msisdn, profilePicture: result.profilePicture  } });
		else
			res.send({'code': config.codes.code_data_not_found, data: 'No user with this msisdn found!'});
}

exports.update_subscribed_package_id = async (req,res) => {
	res.status(500).send({ code: config.codes.code_error, message: "No Package to Update" });
}