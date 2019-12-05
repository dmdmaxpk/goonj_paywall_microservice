const mongoose = require('mongoose');
const ShortId = require('mongoose-shortid-nodeps');
const {Schema} = mongoose;


const userSchema = new Schema({
    //Generating shortid instead of uuid also neglecting special symbols
    _id: { type: ShortId, alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', len: 6, retries: 4 },
    username: String,
    fullname: String,
    email: String,
    description: String,
    mobile: String,

    //source of the user or the origin of the user
    source: String,
    preferences: { type: Array, index: true },

    added_dtm: { type: Date, default: Date.now, index: true },
    last_modified: Date,
    avatar: String,
    active: { type: Boolean, default: true, index: true }
}, { strict: true })

module.exports = mongoose.model('User', userSchema);