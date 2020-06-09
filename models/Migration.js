const mongoose = require('mongoose');
const ShortId = require('mongoose-shortid-nodeps');
const {Schema} = mongoose;
const ObjectId = Schema.ObjectId;

const migrationSchema = new Schema({
    //Generating shortid instead of uuid
    _id: { type: ShortId, len: 8, retries: 4 },
    migration_message: {type: String, index: true},
    rejection_message: {type: String, index: true},
    history_message: {type: String, index: true},
    subscriber_id: ShortId,
    history_id: ShortId,
    added_dtm: { type: Date, default: Date.now, index: true },
}, { strict: true })

module.exports = mongoose.model('Migration', migrationSchema);