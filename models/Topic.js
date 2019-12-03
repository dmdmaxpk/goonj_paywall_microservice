const mongoose = require('mongoose');
const ShortId = require('mongoose-shortid-nodeps');
const {Schema} = mongoose;


const topicSchema = new Schema({
    _id: ShortId,
    name: { type: String, trim: true },
    weightage: Number,      // For setting the sequence
    added_dtm: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Topic', topicSchema);