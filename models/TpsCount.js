const mongoose = require('mongoose');
const {Schema} = mongoose;

const tpsCount = new Schema({
    messagetpsCount: {type: Number, default: 0},
    subscriptiontpsCount: {type: Number, default: 0},
    easypaisatpsCount: {type: Number, default: 0},
    subscriptionquerytpsCount: {type: Number, default: 0},
    balanceCheckCount: {type: Number, default: 0},
    freeMbsCount: {type: Number, default: 0}
}, { strict: true })
module.exports = mongoose.model('TpsCount', tpsCount);