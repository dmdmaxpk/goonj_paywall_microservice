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
	let gw_transaction_id = req.query.transaction_id;

	let { msisdn } = req.params;
	if (msisdn) {
		result = await repo.getUserByMsisdn(msisdn);
		if(result){
			res.send({code: config.codes.code_success, subscription_status: result.subscription_status, is_gray_listed: result.is_gray_listed, gw_transaction_id: gw_transaction_id});
		}else{
			res.send({code: config.codes.code_data_not_found, message: 'Data not found', gw_transaction_id: gw_transaction_id});
		}
	}
	else{
		res.send({code: config.codes.code_invalid_data_provided, message: 'Invalid msisdn', gw_transaction_id: gw_transaction_id});
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
	res.status(500).send({ code: config.codes.code_error, message: "No Package to Update" });

}