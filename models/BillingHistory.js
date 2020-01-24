const mongoose = require('mongoose');
const ShortId = require('mongoose-shortid-nodeps');
const {Schema} = mongoose;

const billingHistorySchema = new Schema({
    //Generating shortid instead of uuid
    _id: { type: ShortId, len: 8, retries: 4 },
    user_id: {
        type:ShortId,
        required: true
    },
    package_id: {
        type: String
    },
    price: {
        type: Number,
        default: 0
    },
    transaction_id: String,
    operator_response: {
        type: {}
    },
    billing_status: String,
    billing_dtm: { type: Date, default: Date.now, index: true },

    //source of the user(android/ios/web/other)
    source: String,
    
    // operator of the user (telenor/zong/ufone etc)
    operator: String
}, { strict: true })

module.exports = mongoose.model('BillingHistory', billingHistorySchema);