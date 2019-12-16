const mongoose = require('mongoose');
const ShortId = require('mongoose-shortid-nodeps');
const {Schema} = mongoose;


const packageSchema = new Schema({
    //Generating shortid instead of uuid also neglecting special symbols
    _id: { type: ShortId, len: 4, retries: 4 },
    package_name: String,
    package_desc: String,
    package_duration: Number, // Hours of package 
    price_point_pkr: Number,
    grace_hours: {type: Number, default: 0 },
    added_dtm: { type: Date, default: Date.now },
    last_modified: Date,
    active: { type: Boolean, default: true }
}, { strict: true })
module.exports = mongoose.model('Package', packageSchema);