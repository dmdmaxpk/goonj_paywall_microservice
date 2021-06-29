const mongoose = require('mongoose');
const ShortId = require('mongoose-shortid-nodeps');
const {Schema} = mongoose;

const billingHistorySchema = new Schema({
    //Generating shortid instead of uuid
    _id: { type: ShortId, len: 45, retries: 8 },
    user_id: { type:ShortId, required: true, index: true },
    subscriber_id: { type:ShortId, required: true, index: true },
    subscription_id: { type:ShortId,  index: true },
    paywall_id: { type:ShortId, required: true, index: true },
    package_id: { type: String },
    
    price: { type: Number, default: 0 },
    transaction_id: String,
    operator_response: { type: {} },
    billing_status: String,
    billing_dtm: { type: Date, default: Date.now, index: true },

    //source of the user(android/ios/web/other)
    source: String,

    micro_charge: { type: Boolean, default: false, index: true },
    discount: { type: Boolean, default: false, index: true },
    
    // operator of the user (telenor/zong/ufone etc)
    operator: String,

    // response time taken by api - TP or EP
    response_time: {type: Number, default: 0}

}, { strict: true })

module.exports = mongoose.model('BillingHistory', billingHistorySchema);
