const config = require('../config');
const container = require("../configurations/container");
const repo = container.resolve("billingHistoryRepository");

// CREATE
exports.post = async (req, res) => {
	let postData = req.body;
	
	// Saving document
	let result = await repo.createBillingHistory(postData);
	res.send({code: config.codes.code_record_added, data: result});
}