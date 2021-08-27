const mongoose = require('mongoose');
const ShortId = require('mongoose-shortid-nodeps');
const {Schema} = mongoose;
const ObjectId = Schema.ObjectId;

const subscriberSchema = new Schema({

    // FOR DATA MIGRATION
    /*_id: { type: ShortId, len: 12, retries: 4 },
    user_id: {type: ShortId, required: true, unique: true},
    subscription_status: String,  // => billed/un-billed/expired/graced/trial
    last_billing_timestamp: Date,
    next_billing_timestamp: Date,
    auto_renewal: { type: Boolean, default: true, index: true },
    total_successive_bill_counts: Number,
    consecutive_successive_bill_counts: Number,

    added_dtm: { type: Date, default: Date.now, index: true },
    last_modified: Date,
    amount_billed_today: {type: Number, default: 0}, // amount charged from user today.
    queued: { type: Boolean, default: false },
    active: { type: Boolean, default: true, index: true },
    time_spent_in_grace_period_in_hours: { type: Number, default: 0 },
    is_discounted: { type: Boolean, default: false },
    discounted_price: { type: Number },
    //field for billling
    is_allowed_to_stream: { type: Boolean, default: true },
    is_billable_in_this_cycle: { type: Boolean, default: false },
    date_on_which_user_entered_grace_period: {type: Date}*/




    // FOR PRODUCTION
    _id: { type: ShortId, len: 8, retries: 4 },
    user_id: {type: ShortId, required: true, unique: true},
    added_dtm: { type: Date, default: Date.now, index: true },
    should_remove: Boolean, // temporary field
    last_modified: Date,
    isMigrated: {type: Boolean, default: false}

}, { strict: true })

module.exports = mongoose.model('Subscriber', subscriberSchema);