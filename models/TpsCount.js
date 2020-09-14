const mongoose = require('mongoose');
const {Schema} = mongoose;

const tpsCount = new Schema({
    subscriptiontpsCount: {type: Number, default: 0},
    easypaisatpsCount: {type: Number, default: 0},
    subscriptionquerytpsCount: {type: Number, default: 0}
}, { strict: true })
module.exports = mongoose.model('TpsCount', tpsCount);