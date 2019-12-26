const config = require('../config');
const repo = require('../repos/OTPRepo');

// CREATE
exports.post = async (req, res) => {
	let postData = req.body;
	let record = await repo.getOtp(postData.msisdn);
	if(record){
		// Record already found
		res.send({code: config.codes.code_record_already_added, message: 'Record already exists'});
	}else{
		// Saving document
		let result = await repo.createOtp(postData);
		res.send({code: config.codes.code_record_added, data: 'OTP sent successfully'});
	}
}

// GET
exports.get = async (req, res) => {
	let { msisdn } = req.query;
	if (msisdn) {
		result = await repo.getOtp(msisdn);
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
	const result = await repo.updateOtp(req.params.msisdn, req.body);
	if (result) {
		res.send({'code': config.codes.code_record_updated, data : result});
	}else {
		res.send({'code': config.codes.code_data_not_found, 'message': 'No otp with this msisdn found!'});
	}
}