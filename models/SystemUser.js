const mongoose = require('mongoose');
const ShortId = require('mongoose-shortid-nodeps');
const {Schema} = mongoose;
const ObjectId = Schema.ObjectId;


const systemUserSchema = new Schema({
    
    //FOR PRODUCTION
    _id: { type: ShortId, len: 12, retries: 4 },
    role:{type:String,enum : ['API', 'CCD']},
    username:{ type: String, required:true, unique: true },
    password:{ type: String, required:true },
    // operator of the user (telenor/zong/ufone etc)
    added_dtm: { type: Date, default: Date.now, index: true },
    last_modified: Date,
    active: { type: Boolean, default: true, index: true }
}, { strict: true });

module.exports = mongoose.model('SystemUser', systemUserSchema);