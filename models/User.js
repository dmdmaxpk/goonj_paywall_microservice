const mongoose = require('mongoose');
const ShortId = require('mongoose-shortid-nodeps');
const {Schema} = mongoose;
const ObjectId = Schema.ObjectId;


const userSchema = new Schema({
    //Generating shortid instead of uuid
    _id: { type: ShortId, len: 8, retries: 4 },
    msisdn: { type: String,required:true, index: true, validate: /^034[0-9]{8}$/ },
    subscription_status: String,
    subscribed_package_id: {type: ShortId, required: true},

    // These fields can be used later in future.
    username: String,
    fullname: String,
    email: String,
    description: String,
    preferences: { type: Array, index: true },
    avatar: String,

    //source of the user or the origin of the user
    source: String,
    marketing_source: { type: String, default: 'none' },
    affiliate_unique_transaction_id: {type:String},
    affiliate_mid: {type:String},
    is_affiliation_callback_executed: { type : Boolean, default: false },
    v1_migrated: { type : Boolean, default: false, index: true },
    
    //fields for FnF flow
    is_gray_listed: { type: Boolean, default: false },
    is_black_listed: { type: Boolean, default: false },
    
    // operator of the user (telenor/zong/ufone etc)
    operator: String,
    added_dtm: { type: Date, default: Date.now, index: true },
    last_modified: Date,
    active: { type: Boolean, default: true, index: true }
}, { strict: true });

module.exports = mongoose.model('User', userSchema);