const mongoose = require('mongoose');
const ShortId = require('mongoose-shortid-nodeps');
const {Schema} = mongoose;
const ObjectId = Schema.ObjectId;


const userSchema = new Schema({
    //Generating shortid instead of uuid
    _id: { type: ShortId, len: 8, retries: 4 },
    msisdn: { type: String,required:true, unique: true },

    // These fields can be used later in future.
    username: String,
    fullname: String,
    email: String,
    description: String,
    preferences: { type: Array, index: true },
    avatar: String,
    dateOfBirth: {type: Date },

    //fields for FnF flow
    is_gray_listed: { type: Boolean, default: false },
    is_black_listed: { type: Boolean, default: false },

    // operator of the user (telenor/zong/ufone etc)
    added_dtm: { type: Date, default: Date.now, index: true },
    last_modified: Date,
    operator: {
        type: String
    },
    active: { type: Boolean, default: true, index: true }
}, { strict: true });

module.exports = mongoose.model('User', userSchema);