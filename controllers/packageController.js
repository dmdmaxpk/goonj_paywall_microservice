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

	let result = await repo.getPackage(query);
	res.send(result);
}

// GET
exports.getAll = async (req, res) => {
	let slug = req.query.slug ;
	let is_default = req.query.is_default ;
	let id = req.query.id ;

	console.log("------------------"+JSON.stringify(req.query)+"-------------------------");

	let paywall = await paywallRepository.getPaywallsBySlug(slug);
	if (paywall){
		let query = {paywall_id: paywall._id};

		if(is_default){
			query.default = is_default;
		}

		if(id){
			query._id = id;
		}

		if(!is_default || is_default==="false" || is_default===false ){
			delete query.default;
		} else {
			query.default = true;
		}
		result = await repo.getAllPackages(query);
		res.send(result);
	} else{
		res.status(200).send("Wrong slug");
	}
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