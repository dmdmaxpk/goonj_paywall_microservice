const config = require('../config');
const container = require('../configurations/container');
const addUsersToSubscriptions = container.resolve('addUsersToSubscriptions');
const repo = require('../repos/SubscriberRepo');


// CREATE
exports.post = async (req, res) => {
	let postData = req.body;
	
	// checking if there's already any subscriber available with this email/subscribername/msisdn
	let record = await repo.getSubscriber(postData.msisdn);
	if(record){
		res.send({code: config.codes.code_record_already_added, 'message': 'Subscriber already exists'});
	}else{
		// Saving document
		let result = await repo.createSubscriber(postData);
		res.send({code: config.codes.code_record_added, data: result});
	}
}

// GET
exports.get = async (req, res) => {
	let { msisdn } = req.params;
	if (msisdn) {
		result = await repo.getSubscriber(msisdn);
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

// UPDATE
exports.put = async (req, res) => {
	const result = await repo.updateSubscriber(req.params.msisdn, req.body);
	if (result) {
		res.send({'code': config.codes.code_record_updated, data : result});
	}else {
		res.send({'code': config.codes.code_data_not_found, data: 'No subscriber with this msisdn found!'});
	}
}


exports.migrateSubs = async (req, res) => {
	addUsersToSubscriptions.AddUsersToSubs();
	res.send({message: 'Migration Started'});
}