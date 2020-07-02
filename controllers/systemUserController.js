const config = require('../config');
const container = require('../configurations/container');
const systemUserService = container.resolve("systemUserService");



// CREATE
exports.login = async (req, res) => {
	try {
		let username = req.body.username;
		let password = req.body.password;
		let response = await systemUserService.login(username,password);
		res.status(200).send({access_token:response})
	} catch(err){
		console.error(err.message);
		res.status(500).send(err.message)
	}
}

exports.unsubscribe = async (req, res) => {
	try {
		console.log("req",req.body);		
		res.status(200).send({test:"test"})
	} catch(err){
		console.error(err.message);
		res.status(500).send(err.message)
	}
}
