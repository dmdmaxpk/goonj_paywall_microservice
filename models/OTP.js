const mongoose = require('mongoose');
const {Schema} = mongoose;

const otpSchema = new Schema({
    msisdn: String,
    otp: String,
    verified: { type: Boolean, default: false },
    last_modified: Date,
    added_dtm: { type: Date, default: Date.now }
}, { strict: true })
module.exports = mongoose.model('Otp', otpSchema);