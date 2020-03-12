const mongoose = require('mongoose');
const {Schema} = mongoose;

const tpsCount = new Schema({
    messagetpsCount: Number,
    subscriptiontpsCount: Number,
    subscriptionquerytpsCount: Number,
    balanceCheckCount: Number
}, { strict: true })
module.exports = mongoose.model('TpsCount', tpsCount);