const mongoose = require('mongoose');
const ShortId = require('mongoose-shortid-nodeps');
const {Schema} = mongoose;

const billingHistorySchema = new Schema({
    //Generating shortid instead of uuid
    _id: { type: ShortId, len: 8, retries: 4 },

    msisdn: String,
    userid: String,
    package: String,
    transection_id: String,
    operator_response: String,
    billing_status: String,
    billing_dtm: { type: Date, default: Date.now, index: true },

    //source of the user(android/ios/web/other)
    platform: String,
    
    // operator of the user (telenor/zong/ufone etc)
    operator: String
}, { strict: true })

module.exports = mongoose.model('BillingHistory', billingHistorySchema);