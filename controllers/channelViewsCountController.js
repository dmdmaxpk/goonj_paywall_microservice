const mongoose = require('mongoose');
const Channel = mongoose.model('Channel');
const axios = require('axios');
const config = require('../config');


// TO INCREASE VIDEO VIEW COUNT
exports.post = async (req, res) => {

    let conditions = {_id: req.body.id};
    let update = {
        $inc: {
            "views_count" : 1
        }
    };

    const result = await Channel.findOneAndUpdate(conditions, update);		// Updating values
    if(result)
	    res.send({"views_count": result.views_count});
    else
        res.send({"status": "500"});
}

// READ
exports.get = async (req, res) => {

    let conditions = {_id: req.body.id};
	const result = await Channel.findOne(conditions);
    if(result)
        res.send({"views_count": result.views_count});
    else
        res.send({"status": "500"});
}