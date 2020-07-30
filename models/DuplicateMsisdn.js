const mongoose = require('mongoose');
const {Schema} = mongoose;


const DuplicateMsisdn = new Schema({
    _id: { type: String },
    count: { type: Number }
}, { strict: true });

module.exports = mongoose.model('DuplicateMsisdn', DuplicateMsisdn);