const mongoose = require('mongoose');
const ShortId = require('mongoose-shortid-nodeps');
const {Schema} = mongoose;


const packageSchema = new Schema({
    //Generating shortid instead of uuid also neglecting special symbols
    _id: { type: ShortId, len: 4, retries: 4 },
    package: String,
    package_desc: String,
    price_point: String,
    grace_hours: {type: String, default: 0 },
    added_dtm: { type: Date, default: Date.now },
    last_modified: Date,
    active: { type: Boolean, default: true }
}, { strict: true })
module.exports = mongoose.model('Package', packageSchema);