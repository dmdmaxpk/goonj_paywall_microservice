// Guests are not used after redesign. Can be removed.
const mongoose = require('mongoose');
const ShortId = require('mongoose-shortid-nodeps');
const {Schema} = mongoose;


const guestSchema = new Schema({
    _id: ShortId,
    name: { type: String, trim: true },
    avatar: String,
    biodata: String,
    weightage: Number,      // Can setup from 1-10 based on high to low, then sort them accordingly, default can be 0
    added_dtm: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Guest', guestSchema);