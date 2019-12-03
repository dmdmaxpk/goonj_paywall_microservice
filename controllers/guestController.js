const mongoose = require('mongoose');
const Guest = mongoose.model('Guest');

// NOTE: Guests are removed after the app redesign

// CREATE
exports.post = async (req, res) => {

	let postData = req.body;

	// Saving document
	const guest = new Guest (postData);
	const result = await guest.save();
	
	console.log(`Guest Added: ${result.name}`);
    res.send("Guest Added!");
}

// READ
exports.get = async (req, res) => {

	const { _id, name } = req.query;
	let query = {};

	if (name) query.name = name;	
	if (_id) query._id = _id;
	
	let result;
	if (_id) {
		result = await Guest.findOne(query); 
	}
	else {
		result = await Guest.find(query).sort({ weightage: -1 });; 		// Sort by highest weightage
	}

	res.send(result);
}

// UPDATE
exports.put = async (req, res) => {

	const query = { _id: req.query._id };
	
	let postBody = req.body;
	
	const result = await Guest.updateOne(query, postBody);		// Update document with the provided _id

	if (result.nModified == 0) {
		console.log('No Guest with this ID found!');
		res.send('No Guest with this ID found!');
	}
	else {
		console.log(`Guest Updated!`);
		res.send(`Guest Updated!`);
	}
}

// DELETE
exports.delete = async (req, res) => {

	const { _id } = req.query;
	
	const result = await Guest.findOneAndRemove({ _id });

	if (result) {
		console.log(`Guest ID: ${_id}, Name: ${result.name} Deleted!`);
		res.send(`Guest ID: ${_id}, Name: ${result.name} Deleted!`);	
	}
	else {
		console.log('No Guest with this ID found!');
		res.send('No Guest with this ID found!');
	}
}