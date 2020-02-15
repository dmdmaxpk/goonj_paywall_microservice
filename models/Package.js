const mongoose = require('mongoose');
const ShortId = require('mongoose-shortid-nodeps');
const {Schema} = mongoose;


const packageSchema = new Schema({
    //Generating shortid instead of uuid also neglecting special symbols
    _id: { type: ShortId, len: 4, retries: 4 },
    package_name: {type: String, required: true},
    package_desc: {type: String, required: true},
    package_duration: {type: Number, required: true}, // Hours of package 
    price_point_pkr: {type: Number, required: true},
    grace_hours: {type: Number, default: 0 },
    added_dtm: { type: Date, default: Date.now },
    last_modified: Date,
    logos: [],
    default: Boolean,
    active: { type: Boolean, default: true }
}, { strict: true })
module.exports = mongoose.model('Package', packageSchema);