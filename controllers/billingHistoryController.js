const config = require('../config');
const repo = require('../repos/BillingHistoryRepo');

// CREATE
exports.post = async (req, res) => {
	let postData = req.body;
	
	// Saving document
	let result = await repo.createBillingHistory(postData);
	res.send({code: config.codes.code_record_added, data: result});
}