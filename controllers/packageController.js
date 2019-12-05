const mongoose = require('mongoose');
const Package = mongoose.model('Package');
const axios = require('axios');
const config = require('../config');


// CREATE
exports.post = async (req, res) => {
	let postData = req.body;
	
	// Saving document
	let package = new Package (postData);
	let result = await package.save();
	console.log(`Package Added: ${result._id}`);
	res.send({code: config.codes.code_record_added, data: result});
}

findPackage = async(packagename) => {
	result = await Package.findOne({packagename: packagename});
	return result;
}

// GET
exports.get = async (req, res) => {

	let { _id } = req.query;
	const query = {};

	if (_id) query._id = _id;

	let result;

	// Single document
	if (_id) {
		result = await Package.findOne(query); 
	}

	// All documents
	else {
		result = await Package.find(query);
	}
	res.send(result);
}

// UPDATE
exports.put = async (req, res) => {
	const query = { _id: req.params.id };
	let postBody = req.body;
	postBody.last_modified = new Date();
	const result = await Package.updateOne(query, postBody);		// Updating values
	
	if (result.nModified == 0) {
		console.log('No package with this ID found!');
		res.send({'code': config.codes.code_invalid_data_provided, 'message': 'No package with this ID found!'});
	}else {
		console.log(`Package Updated ${query._id}`);
		res.send({'code': config.codes.code_record_updated, 'message' : 'Data updated successfully'});
	}
}

// DELETE
exports.delete = async (req, res) => {
	
	//Soft delete
	const query = { _id: req.params.id, active: true };
	let postBody = {active: false};
	postBody.last_modified = new Date();	// Adding last_modified on video update
	const result = await Package.updateOne(query, postBody);		// Updating values
	
	if (result.nModified == 0) {
		console.log('No package with this ID found!');
		res.send({'code': config.codes.code_invalid_data_provided, 'message': 'No package with this ID found!'});
	}else {
		console.log(`Package deleted ${query._id}`);
		res.send({'code': config.codes.code_record_deleted, 'message' : 'Package deleted successfully'});
	}
}