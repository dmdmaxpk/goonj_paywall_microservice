const mongoose = require('mongoose');
const Channel = mongoose.model('Channel');


// CREATE
exports.post = async (req, res) => {

    const postData = req.body;
	console.log('Channel Body: ', postData);

	// Saving document
	let channel = new Channel (postData);
	let result = await channel.save();
	
	console.log(`Channel Added: ${result.name}`);
    res.send(`Channel Added: ${result.name}`);
}

// READ
exports.get = async (req, res) => {

	let { _id, slug, active } = req.query;
	const query = {};

	if (_id) query._id = _id;
	if (slug) query.slug = slug;	
	if (active) query.active = JSON.parse(active);		// Conversion of string to Boolean

	let result;
	// Single document
	if (_id || slug) {
		result = await Channel.findOne(query); 		// Finding document on provided id or slug
	}
	// All documents
	else {
		result = await Channel.find(query).sort({ seq: 1 }); 		// Sorting results by seq
	}

	res.send(result);
}

// UPDATE
exports.put = async (req, res) => {

	const query = { _id: req.query._id };
	
	let postBody = req.body;
	postBody.last_modified = new Date();	// Setting last_modified time and date on which it was updated
	
	const result = await Channel.updateOne(query, postBody);	// Update document with the provided _id

	if (result.nModified == 0) {	// mongo result
		console.log('No channel with this ID found!');
		res.send('No channel with this ID found!');
	}
	else {
		console.log('Channel Updated!');
		res.send('Channel Updated!');
	}
}

// DELETE
exports.delete = async (req, res) => {

	const { _id } = req.query;

	const result = await Channel.findOneAndRemove({ _id });		// Delete document with the provided _id

	if (result) {
		console.log(`Channel ID: ${_id}, Name: ${result.name} Deleted!`);
		res.send(`Channel ID: ${_id}, Name: ${result.name} Deleted!`);
	}
	else {
		console.log(`No channel with this ID: ${_id} found!`);
		res.send(`No channel with this ID: ${_id} found!`);
	}
}