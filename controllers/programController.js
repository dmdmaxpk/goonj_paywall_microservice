const mongoose = require('mongoose');
const Program = mongoose.model('Program');


// CREATE
exports.post = async (req, res) => {

    const postData = req.body;
	console.log(postData);

	// Saving document
	let program = new Program (postData);
	let result = await program.save();
	
	console.log(`Program Added: ${result.name}`);
    res.send("Program Added!");
}

// READ
exports.get = async (req, res) => {

	let { _id, name } = req.query;
	const query = {};

	if (name) query.name = name;	
	if (_id) query._id = _id;

	let result;
	// Single document
	if (_id) {
		result = await Program.findOne(query); 		// Find document on provided id
	}
	// All documents
	else {
		result = await Program.find(query).sort({ weightage: -1 });		// Sorting results by weightage
	}

	res.send(result);
}

// UPDATE
exports.put = async (req, res) => {

	const query = { _id: req.query._id };
	
	let postBody = req.body;
	
	const result = await Program.updateOne(query, postBody);

	if (result.nModified == 0) {
		console.log('No program with this ID found!');
		res.send('No program with this ID found!');
	}
	else {
		console.log('Program Updated!');
		res.send('Program Updated!');
	}
}

// DELETE
exports.delete = async (req, res) => {

	const { _id } = req.query;
	const result = await Program.findOneAndRemove({ _id });

	if (result) {
		console.log(`Program ID: ${_id}, Name: ${result.name} Deleted!`);
		res.send(`Program ID: ${_id}, Name: ${result.name} Deleted!`);
	}
	else {
		console.log(`No program with this ID: ${_id} found!`);
		res.send(`No program with this ID: ${_id} found!`);
	}
}