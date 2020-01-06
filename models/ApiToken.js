const mongoose = require('mongoose');
const {Schema} = mongoose;

const apiTokenSchema = new Schema({
    token: {
        type: String, required:true
    },
    last_modified: Date,
    added_dtm: { type: Date, default: Date.now }
}, { strict: true })
module.exports = mongoose.model('ApiToken', apiTokenSchema);