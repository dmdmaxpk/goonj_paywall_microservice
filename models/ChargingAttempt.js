const mongoose = require('mongoose');
const {Schema} = mongoose;
const ShortId = require('mongoose-shortid-nodeps');

const chargingAttemptsSchema = new Schema({
    _id: { type: ShortId, len: 6, retries: 3 },
    subscriber_id: {type: ShortId, required: true, unique: true},
    price_to_charge: {type: Number, default: 0},
    number_of_attempts_today: {type: Number, default: 0},
    number_of_total_attempts: {type: Number, default: 0},
    active: {type: Boolean, default: true},
    last_modified: Date,
    added_dtm: { type: Date, default: Date.now }
}, { strict: true });
module.exports = mongoose.model('ChargingAttempt', chargingAttemptsSchema);