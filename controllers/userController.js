const mongoose = require('mongoose');
const User = mongoose.model('User');
const axios = require('axios');
const config = require('../config');


// CREATE
exports.post = async (req, res) => {
	let postData = req.body;
	
	// checking if there's already any user available with this email/username
	let record = await findUser(postData.username);
	if(record){
		console.log('User already exists: '+ record._id);
		res.send({code: config.codes.code_record_already_added, 'message': 'User already exists'});
	}else{
		// Saving document
		let user = new User (postData);
		let result = await user.save();
		console.log(`User Added: ${result._id}`);
		res.send({code: config.codes.code_record_added, data: result});
	}
}

findUser = async(username) => {
	result = await User.findOne({username: username});
	return result;
}

// GET
exports.get = async (req, res) => {

	let { _id, username, email, mobile} = req.query;
	const query = {};

	if (_id) query._id = _id;
	if (username) query.username = username;	
	if (email) query.email = email;
	if (mobile) query.mobile = mobile;

	let result;
	// Single document
	if (_id) {
		result = await User.findOne(query); 
		console.log(`GET User by ID = ${_id}`);
	}

	// All documents
	else {
		// Sorting by added_dtm && Applying limit if provided otherwise default 16
		result = await User.findOne(query);
	}
	res.send(result);
}

// UPDATE
exports.put = async (req, res) => {
	const query = { mobile: req.params.mobile };
	let postBody = req.body;
	postBody.last_modified = new Date();	// Adding last_modified on video update
	const result = await User.updateOne(query, postBody);		// Updating values
	
	if (result.nModified == 0) {
		console.log('No user with this ID found!');
		res.send({'code': config.codes.code_invalid_data_provided, 'message': 'No user with this ID found!'});
	}else {
		console.log(`User Updated ${query._id}`);
		res.send({'code': config.codes.code_record_updated, 'message' : 'Data updated successfully'});
	}
}

// DELETE
exports.delete = async (req, res) => {
	
	//Soft delete
	
	const query = { _id: req.params.id, active: true };
	let postBody = {active: false};
	postBody.last_modified = new Date();	// Adding last_modified on video update
	const result = await User.updateOne(query, postBody);		// Updating values
	
	if (result.nModified == 0) {
		console.log('No user with this ID found!');
		res.send({'code': config.codes.code_invalid_data_provided, 'message': 'No user with this ID found!'});
	}else {
		console.log(`User deleted ${query._id}`);
		res.send({'code': config.codes.code_record_deleted, 'message' : 'User deleted successfully'});
	}
}