const mongoose = require('mongoose');
const ShortId = require('mongoose-shortid-nodeps');
const {Schema} = mongoose;


const paywallSchema = new Schema({
    
    //Generating shortIds instead of uuid also neglecting special symbols
    _id: { type: ShortId, len: 4, retries: 4 },
    paywall_name: {type: String, required: true},
    paywall_desc: {type: String},
    added_dtm: { type: Date, default: Date.now },
    last_modified: Date,
    active: { type: Boolean, default: true }

}, { strict: true })
module.exports = mongoose.model('Paywall', paywallSchema);