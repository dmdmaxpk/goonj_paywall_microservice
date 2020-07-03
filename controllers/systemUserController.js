const config = require('../config');
const container = require('../configurations/container');
const systemUserService = container.resolve("systemUserService");
const subscriptionService = container.resolve("subscriptionService");



// CREATE
exports.login = async (req, res) => {
	try {
		let username = req.body.username;
		let password = req.body.password;
		let response = await systemUserService.login(username,password);
		res.status(200).send({access_token:response});
	} catch(err){
		console.error(err.message);
		res.status(500).send(err.message)
	}
}

exports.unsubscribe = async (req, res) => {
		console.log("req",req.body);
		try {
			let result = await subscriptionService.expireByMsisdn(req.body.msisdn,req.body.slug,"unsub_api",undefined);
			console.log("[systemUnsubscribe]result",result);
			res.status(200).send({result});
		} catch(err) {
			console.log("error",err);
			res.send(err);
		} 
}
