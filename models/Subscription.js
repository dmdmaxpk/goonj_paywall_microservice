const mongoose = require('mongoose');
const ShortId = require('mongoose-shortid-nodeps');
const {Schema} = mongoose;
const ObjectId = Schema.ObjectId;

const subscriptionSchema = new Schema({
    
    //Generating shortid instead of uuid
    _id: { type: ShortId, len: 8, retries: 4},

    subscriber_id: {type: ShortId, required: true},
    paywall_id: {type: ShortId, required: true},
    subscribed_package_id: {type: ShortId, required: true},
    
    subscription_status: String,  // => billed/not_billed/expired/graced/trial
    last_billing_timestamp: Date,
    next_billing_timestamp: Date,
    auto_renewal: { type: Boolean, default: true, index: true },
    total_successive_bill_counts: Number,
    consecutive_successive_bill_counts: Number,

    // Sources
    source: String,
    marketing_source: { type: String, default: 'none' },

    //fields for FnF flow
    is_gray_listed: { type: Boolean, default: false },
    is_black_listed: { type: Boolean, default: false },

    // Affiliation marketing fields
    affiliate_unique_transaction_id: {type:String},
    affiliate_mid: {type:String},
    is_affiliation_callback_executed: { type : Boolean, default: false },

    added_dtm: { type: Date, default: Date.now, index: true },
    last_modified: Date,
    queued: { type: Boolean, default: false },
    
    is_discounted: { type: Boolean, default: false },
    discounted_price: { type: Number, default: 0 },

    try_micro_charge_in_next_cycle: { type: Boolean, default: false },
    micro_price_point: { type: Number, default: 0 },
    
    //field for billing
    is_allowed_to_stream: { type: Boolean, default: false },
    is_billable_in_this_cycle: { type: Boolean, default: false },
    date_on_which_user_entered_grace_period: {type: Date},

    amount_billed_today: {type: Number, default: 0},
    is_manual_recharge: { type: Boolean, default: false },
    active: { type: Boolean, default: true, index: true }
}, { strict: true });
subscriptionSchema.index({subscriber_id:1,paywall_id:1},{unique: true});

module.exports = mongoose.model('Subscription', subscriptionSchema);