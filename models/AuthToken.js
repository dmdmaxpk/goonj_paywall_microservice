const mongoose = require('mongoose');
const ShortId = require('mongoose-shortid-nodeps');
const {Schema} = mongoose;

const AuthTokenSchema = new Schema({

    _id: { type: ShortId, len: 16, retries: 8 },
    user_id: { type:ShortId, required: true, unique: true },
    msisdn: { type:String, required: true, unique: true },
    auth_token: { type:String, required: true,index: true }

}, { strict: true });

module.exports = mongoose.model('AuthToken', AuthTokenSchema);