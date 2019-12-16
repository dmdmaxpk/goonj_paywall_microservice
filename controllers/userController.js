const config = require('../config');
const repo = require('../repos/UserRepo');

// CREATE
exports.post = async (req, res) => {
	let postData = req.body;
	
	// checking if there's already any user available with this email/username/msisdn
	let record = await repo.getUser(postData.msisdn);
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
		result = await repo.getUser(msisdn);
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
	const result = await repo.updateUser(req.params.msisdn, req.body);
	if (result) {
		res.send({'code': config.codes.code_record_updated, data : result});
	}else {
		res.send({'code': config.codes.code_data_not_found, data: 'No user with this msisdn found!'});
	}
}