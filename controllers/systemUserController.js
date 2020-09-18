const config = require('../config');
const container = require('../configurations/container');
const systemUserService = container.resolve("systemUserService");
const subscriptionService = container.resolve("subscriptionService");



// CREATE
exports.login = async (req, res) => {
	console.log("+++++++++++++LOGIN+++++++++++++++");
	let gw_transaction_id = req.body.transaction_id;
	try {
		let username = req.body.username;
		let password = req.body.password;
		let response = await systemUserService.login(username,password);
		res.status(200).send({access_token:response, gw_transaction_id: gw_transaction_id});
	} catch(err){
		console.error(err.message);
		res.status(500).json({message:err.message,gw_transaction_id: gw_transaction_id})
	}
}

exports.unsubscribe = async (req, res) => {
		try {
			let gw_transaction_id = req.body.transaction_id; 
			let result = await subscriptionService.expireByMsisdn(req.body.msisdn,req.body.slug,"unsub_api",undefined);
			res.status(200).send({result,gw_transaction_id});
		} catch(err) {
			console.log("error",err);
			res.json({message:err,gw_transaction_id: gw_transaction_id});
		} 
}
