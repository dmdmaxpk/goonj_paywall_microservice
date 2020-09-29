const config = require('../config');
const container = require('../configurations/container');
const systemUserService = container.resolve("systemUserService");
const subscriptionService = container.resolve("subscriptionService");



// CREATE
exports.login = async (req, res) => {

	let gw_transaction_id = req.body.transaction_id;
	try {
		let username = req.body.username;
		let password = req.body.password;
		let response = await systemUserService.login(username,password);
		response.gw_transaction_id = gw_transaction_id;
		res.status(200).send(response);
	} catch(err){
		console.error(err.message);
		res.status(500).json({message:err.message,gw_transaction_id: gw_transaction_id})
	}
}

exports.unsubscribe = async (req, res) => {
	try {
		let gw_transaction_id = req.body.transaction_id;
		let msisdn = req.body.msisdn;
		let slug = req.body.slug;

		let result = await subscriptionService.expireByNumber(msisdn, slug);
		res.status(200).send({message: result, gw_transaction_id: gw_transaction_id});
	} catch(err) {
		console.log("error",err);
		res.json({message:err,gw_transaction_id: gw_transaction_id});
	} 
}
