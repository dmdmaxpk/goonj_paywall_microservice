const mongoose = require('mongoose');
const ShortId = require('mongoose-shortid-nodeps');
const {Schema} = mongoose;

const paymentSources = new Schema({
    _id: { type: ShortId, len: 4, retries: 4 },
    source_name: { type: String, default: false },
    last_modified: Date,
    added_dtm: { type: Date, default: Date.now }
}, { strict: true });

module.exports = mongoose.model('PaymentSources', paymentSources);
