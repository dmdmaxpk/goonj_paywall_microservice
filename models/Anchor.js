const mongoose = require('mongoose');
const ShortId = require('mongoose-shortid-nodeps');
const {Schema} = mongoose;


const anchorSchema = new Schema({
    _id: ShortId,
    name: { type: String, trim: true },
    avatar: String,
    weightage: Number,      // For setting the sequence
    added_dtm: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Anchor', anchorSchema);