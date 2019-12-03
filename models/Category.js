const mongoose = require('mongoose');
const ShortId = require('mongoose-shortid-nodeps');
const shortid = require('shortid');
const {Schema} = mongoose;


// Sub category can be removed as they were removed from frontend in new design (Just keeping in case they change their mind)
const subcatSchema = new Schema({ 
    _id: {
        type: String,
        'default': shortid.generate     //Because the mongoose shortid does not work on nested schemas
    },
    name: { type: String, trim: true },
    description: String,
    added_dtm: { type: Date, default: Date.now }
});

const categorySchema = new Schema({
    _id: ShortId,
    name: { type: String, trim: true },
    sub_categories: [subcatSchema],
    added_dtm: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Category', categorySchema);