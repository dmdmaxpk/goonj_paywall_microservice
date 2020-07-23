const mongoose = require('mongoose');
const ShortId = require('mongoose-shortid-nodeps');
const {Schema} = mongoose;

const paymentSourceSchema = new Schema({
    _id: { type: ShortId, len: 4, retries: 4 },
    source_name: {type: String, required: true},
    slug: {type: String, required: true},
    active: { type: Boolean, default: true },
    added_dtm: { type: Date, default: Date.now }
}, { strict: true })
module.exports = mongoose.model('PaymentSource', paymentSourceSchema);