const config = require('../config');
const container = require('../configurations/container');
const repo = container.resolve("packageRepository");
const paywallRepository = container.resolve("paywallRepository");


// CREATE
exports.post = async (req, res) => {
	let postData = req.body;
	
	// Saving document
	try {
		let result = await repo.createPackage(postData);
		res.send({code: config.codes.code_record_added, data: result});
	} catch(error) {
		console.log(error);
		res.status(501).send({code: config.codes.code_invalid_data_provided, data: error.message});
	}
}

// GET
exports.get = async (req, res) => {
	let query = {};
	if(req.query.id){
		query._id = req.query.id;
	}

	result = await repo.getPackage(query);
	res.send(result);
}

// GET
exports.getAll = async (req, res) => {
	console.time("getAllPackages");
	console.log("req.decoded",req.decoded);
	let paywall_id = "";
	let slug = req.query.slug;
	if (!slug){
		slug = "live"		
	}
	paywall = await paywallRepository.getPaywallsBySlug(slug);
	console.log("--",paywall);
	result = await repo.getAllPackages({paywall_id : paywall._id });
	console.timeEnd("getAllPackages");
	res.send(result);
}

// UPDATE
exports.put = async (req, res) => {
	const result = await repo.updatePackage(req.params.id, req.body);
	if (result.nModified == 0) {
		res.send({'code': config.codes.code_data_not_found, 'message': 'No user with this msisdn found!'});
	}else {
		res.send({'code': config.codes.code_record_updated, 'message' : 'Data updated successfully'});
	}
}