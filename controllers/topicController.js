const mongoose = require('mongoose');
const Topic = mongoose.model('Topic');


// CREATE
exports.post = async (req, res) => {

	let postData = req.body;
	console.log(postData);

	// Saving document
	const topic = new Topic (postData);
	const result = await topic.save();
	
	console.log(`Topic Added: ${result.name}`);
    res.send("Topic Added!");
}

// READ
exports.get = async (req, res) => {

	const { _id, name } = req.query;
	let query = {};

	if (name) query.name = name;	
	if (_id) query._id = _id;

	let result;
	// Single document
	if (_id) {
		result = await Topic.findOne(query);	// Find document on provided id
	}
	// All documents
	else {
		result = await Topic.find(query).sort({ weightage: -1 });	// Sort by highest weightage
	}

	res.send(result);
}

// UPDATE
exports.put = async (req, res) => {

	const query = { _id: req.query._id };
	
	let postBody = req.body;
	
	const result = await Topic.updateOne(query, postBody);

	if (result.nModified == 0) {
		console.log('No Topic with this ID found!');
		res.send('No Topic with this ID found!');
	}
	else {
		console.log(`TOPIC Updated!`);
		res.send(`TOPIC Updated!`);
	}
}

// DELETE
exports.delete = async (req, res) => {
	const { _id } = req.query;
	const result = await Topic.findOneAndRemove( { _id } );
	console.log(result);
	if (result) {
		console.log(`Topic ID: ${_id}, Name: ${result.name} Deleted!`);
		res.send(`Topic ID: ${_id}, Name: ${result.name} Deleted!`);
	}
	else {
		console.log('No Topic with this ID found!');
		res.send('No Topic with this ID found!');
	}
}