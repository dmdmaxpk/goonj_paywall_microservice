const mongoose = require('mongoose');
const ShortId = require('mongoose-shortid-nodeps');
const {Schema} = mongoose;

const blockedUsersSchema = new Schema({
    //Generating shortid instead of uuid
    _id: { type: ShortId, len: 8, retries: 4 },
    msisdn: {
        type:String,
        required: true
    },
    transaction_id: String,
    operator_response: {
        type: {}
    },
    added_dtm: { type: Date, default: Date.now, index: true },
    //source of the user(android/ios/web/other)
    source: String, 
    operator: {type: String, default: 'not_telenor'}
}, { strict: true })

module.exports = mongoose.model('BlockedUser', blockedUsersSchema);