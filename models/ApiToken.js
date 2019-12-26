const mongoose = require('mongoose');
const {Schema} = mongoose;

const apiTokenSchema = new Schema({
    token: String,
    last_modified: Date,
    added_dtm: { type: Date, default: Date.now }
}, { strict: true })
module.exports = mongoose.model('ApiToken', apiTokenSchema);