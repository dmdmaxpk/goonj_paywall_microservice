const mongoose = require('mongoose');
const ShortId = require('mongoose-shortid-nodeps');
const {Schema} = mongoose;

const otpSchema = new Schema({
    _id: { type: ShortId, len: 4, retries: 4 },
    msisdn: {type: String, required: true},
    otp: {type: String, required: true},
    verified: { type: Boolean, default: false },
    last_modified: Date,
    added_dtm: { type: Date, default: Date.now }
}, { strict: true })
module.exports = mongoose.model('Otp', otpSchema);

//TODO: To add OTP expiry