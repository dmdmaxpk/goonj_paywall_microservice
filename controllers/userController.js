const config = require('../config');
const repo = require('../repos/UserRepo');
const packageRepo = require('../repos/PackageRepo');
let billingHistoryRepo = require('../repos/BillingHistoryRepo');
let subscriberRepo = require('../repos/SubscriberRepo');

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
	let { msisdn } = req.query;
	if (msisdn) {
		result = await repo.getUserByMsisdn(msisdn);
		if(result){
			res.send({code: config.codes.code_success, data: result});
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
	let { msisdn } = req.params;
	if (msisdn) {
		result = await repo.getUserByMsisdn(msisdn);
		if(result){
			res.send({code: config.codes.code_success, subscription_status: result.subscription_status, is_gray_listed: result.is_gray_listed});
		}else{
			res.send({code: config.codes.code_data_not_found, message: 'Data not found'});
		}
	}
	else{
		res.send({code: config.codes.code_invalid_data_provided, message: 'Invalid msisdn'});
	}
}

// UPDATE
exports.put = async (req, res) => {
	const result = await repo.updateUser(req.params.msisdn, req.body);
	if (result) {
		res.send({'code': config.codes.code_record_updated, data : result});
	}else {
		res.send({'code': config.codes.code_data_not_found, data: 'No user with this msisdn found!'});
	}
}

// update PackageId

exports.update_subscribed_package_id = async (req,res) => {
	let new_package_id = req.body.new_package_id;
	let user_id = req.body.user_id;
	let package = await packageRepo.getPackage({_id: new_package_id});
	if (package) {
		let user  = await repo.getUserById(user_id);
		if (user) {
			let billingHistoryObject = {};
			billingHistoryObject.user_id = user._id;
			billingHistoryObject.billing_status = "package-switched";
			billingHistoryObject.operator = 'telenor';

			user.subscribed_package_id = new_package_id;
			let updated  = await repo.updateUserById(user_id, user);
			if (updated) {
				await subscriberRepo.updateSubscriber(user_id, {auto_renewal: true});
				billingHistoryObject.package_id = updated.subscribed_package_id;
				await billingHistoryRepo.createBillingHistory(billingHistoryObject);
				res.status(200).send({ code: config.codes.code_success, data: updated });
			} else {
				billingHistoryObject.billing_status = "package-switching-failed";
				billingHistoryObject.package_id = updated.subscribed_package_id;
				await billingHistoryRepo.createBillingHistory(billingHistoryRepo);

				res.status(200).send({ code: config.codes.code_error, message: "Error while updating User" });
			}
			
		} else {
			res.status(200).send({ code: config.codes.code_error, message: "User not Found!" });
		}

	} else {
		res.status(200).send({ code: config.codes.code_error, message: "Package does not exist!" });
	}

}