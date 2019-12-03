const mongoose = require('mongoose');
const Video = mongoose.model('Video');
const axios = require('axios');
const config = require('../config');


// CREATE
exports.post = async (req, res) => {

    let postData = req.body;

	// Saving document
	let video = new Video (postData);
	let result = await video.save();
	
	console.log(`Video Added: ${result._id}`);
	
	// Adding operator name for transcoding service:
	result._doc.operator = 'telenor';	// _doc (field in object, IDK!!)

	// After saving it to DB, sending tuple to transcoding service:
	axios.post(config.transcodeServiceUrl, result)
		.then( response => console.log(response.data) )
		.catch( error => console.log(error) )

    res.send(`Video Added: ${result._id}`);
}

// READ
exports.get = async (req, res) => {

	let { _id, title, category, sub_category, added_dtm, active, feed, anchor, topics, pinned, skip, limit } = req.query;
	const query = {};

	if (_id) query._id = _id;
	if (title) query.title = title;	
	if (category) query.category = category;
	if (sub_category) query.sub_category = sub_category;
	if (anchor) query.anchor = { $in: anchor.split(',') } 
	if (topics) query.topics = { $in: topics.split(',') } 
	if (added_dtm) query.added_dtm = added_dtm;
	if (feed) query.feed = feed;
	if (active) query.active = active;
	if (pinned) query.pinned = JSON.parse(pinned);		// Conversion of string to Boolean

	let result;
	
	// Single document
	if (_id) {
		result = await Video.findOne(query); 
		console.log(`GET Video by ID=${_id}`);
	}
	// All documents
	else {
		result = await Video.find(query).sort({ added_dtm: -1 }).limit(Number(limit) || 16);  		// Sorting by added_dtm && Applying limit if provided otherwise default 16
	}

	res.send(result);
}

// UPDATE
exports.put = async (req, res) => {

	const query = { _id: req.query._id };
	
	let postBody = req.body;
	postBody.last_modified = new Date();	// Adding last_modified on video update
	
	const result = await Video.updateOne(query, postBody);		// Updating values
	
	if (result.nModified == 0) {
		console.log('No Video with this ID found!');
		res.send('No Video with this ID found!');
	}
	else {
		console.log(`Video Updated!`);
		res.send(`Video Updated!`);
	}
}

// DELETE
exports.delete = async (req, res) => {

	const query = { _id: req.query._id };

	const result = await Video.findOneAndRemove( query );	// Removing document based on the _id provided
	
	if (result) {
		console.log(`Video _id: ${query._id} Deleted!`);
		res.send(`Video _id: ${query._id} Deleted!`);
	}
	else {
		console.log('No video with this ID found!');
		res.send('No video with this ID found!');
	}
}