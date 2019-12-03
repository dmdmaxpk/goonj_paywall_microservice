const mongoose = require('mongoose');
const ShortId = require('mongoose-shortid-nodeps');
const {Schema} = mongoose;


const programSchema = new Schema({
    _id: ShortId,           // Generating shortid instead of uuid
    name: { type: String, trim: true },
    weightage: Number,      // For setting the sequence
    added_dtm: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Program', programSchema);