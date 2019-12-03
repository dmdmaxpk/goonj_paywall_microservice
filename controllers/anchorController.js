const mongoose = require('mongoose');
const Anchor = mongoose.model('Anchor');

// CREATE
exports.post = async (req, res) => {

	let postData = req.body;

	// Saving the post data to DB
	const anchor = new Anchor (postData);
	const result = await anchor.save();
	
	console.log(`Anchor Added: ${result.name}`);
    res.send("Anchor Added!");
}

// READ
exports.get = async (req, res) => {

	const { _id, name } = req.query;
	let query = {};

	// Applying conditions for query
	if (name) query.name = name;	
	if (_id) query._id = _id;

	let result;

	if (_id) {
		result = await Anchor.findOne(query);	// Finding result on _id
	}
	else {
		result = await Anchor.find(query).sort({ weightage: -1 });	// Sort by highest weightage
	}

	res.send(result);
}

// UPDATE
exports.put = async (req, res) => {

	const query = { _id: req.query._id };
	
	let postBody = req.body;
	
	const result = await Anchor.updateOne(query, postBody);		// Updating document for the corresponding _id

	if (result.nModified == 0) {
		console.log('No Anchor with this ID found!');
		res.send('No Anchor with this ID found!');
	}
	else {
		console.log(`Anchor Updated!`);
		res.send(`Anchor Updated!`);
	}
}

// DELETE
exports.delete = async (req, res) => {

	const { _id } = req.query;

	const result = await Anchor.findOneAndRemove({ _id });	// Deleting document for the corresponding _id

	if (result) {
		console.log(`Anchor ID: ${_id}, Name: ${result.name} Deleted!`);
		res.send(`Anchor ID: ${_id}, Name: ${result.name} Deleted!`);	
	}
	else {
		console.log('No Anchor with this ID found!');
		res.send('No Anchor with this ID found!');
	}
}