const mongoose = require('mongoose');
const BlockedUser = mongoose.model('BlockedUser');

createHistory = async(postData) => {
    let billingHistory = new BlockedUser(postData);
    let result = await billingHistory.save();
    return result;
}



module.exports = {
    createHistory: createHistory,
}