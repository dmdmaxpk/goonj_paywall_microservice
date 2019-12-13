const mongoose = require('mongoose');
const ShortId = require('mongoose-shortid-nodeps');
const {Schema} = mongoose;

const subscriberSchema = new Schema({
    //Generating shortid instead of uuid
    _id: { type: ShortId, len: 8, retries: 4 },

    msisdn: String,
    userid: String,
    package: String,
    subscription_status: String,  // => billed/un-billed/expired/graced
    last_billing_timestamp: Date,
    next_billing_timestamp: Date,
    auto_renewal: { type: Boolean, default: true, index: true },
    total_successive_bill_counts: Number,
    consecutive_successive_bill_counts: Number,

    //source of the user(android/ios/web/other)
    platform: String,

    // operator of the user (telenor/zong/ufone etc)
    operator: String,

    added_dtm: { type: Date, default: Date.now, index: true },
    last_modified: Date,

    active: { type: Boolean, default: true, index: true }
}, { strict: true })

module.exports = mongoose.model('Subscriber', subscriberSchema);