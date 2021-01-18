const mongoose = require('mongoose');
const ShortId = require('mongoose-shortid-nodeps');

const {Schema} = mongoose;

const dateTestSchema = new Schema({
    _id: { type: ShortId, len: 12, retries: 4},
    original_billing_timestamp: Date,
    original_billing_timestamp: Date,
    last_billing_timestamp: Date,
    next_billing_timestamp: Date,
    test: String,
}, { strict: true })
module.exports = mongoose.model('DateTest', dateTestSchema);