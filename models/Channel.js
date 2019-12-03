const mongoose = require('mongoose');
const ShortId = require('mongoose-shortid-nodeps');
const {Schema} = mongoose;


const channelSchema = new Schema({
    _id: ShortId,
    name: String,
    slug: { type: String, index: true },    // For sharing videos from web to app and vice versa
    description: String,                    // Was used in old design
    category: String,
    thumbnail: String,
    logo: String,                           // Was used in old design, now only thumbnail is working
    hls_link: String,
    seq: Number,                            // Sequence for frontend
    active: Boolean,
    ad_tag: {type: String, default: ""},                         // Ad tag from channel to display ads on their videos/live
    views_count: {type: Number, default: 0},
    added_dtm: { type: Date, default: Date.now },
    last_modified: Date
});

module.exports = mongoose.model('Channel', channelSchema);