const mongoose = require('mongoose');
const ShortId = require('mongoose-shortid-nodeps');
const {Schema} = mongoose;
const ObjectId = Schema.ObjectId;


const userSchema = new Schema({
    //Generating shortid instead of uuid
    _id: { type: ShortId, len: 8, retries: 4 },
    msisdn: { type: String, index: true },
    subscribed_package_id: ShortId,

    // These fields can be used later in future.
    username: String,
    fullname: String,
    email: String,
    description: String,
    preferences: { type: Array, index: true },
    avatar: String,

    //source of the user or the origin of the user
    source: String,
    
    // operator of the user (telenor/zong/ufone etc)
    operator: String,
    added_dtm: { type: Date, default: Date.now, index: true },
    last_modified: Date,
    active: { type: Boolean, default: true, index: true }
}, { strict: true })

module.exports = mongoose.model('User', userSchema);