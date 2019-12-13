const mongoose = require('mongoose');
const BillingHistory = mongoose.model('BillingHistory');

createBillingHistory = async(postData) => {
    let billingHistory = new BillingHistory(postData);
    let result = await billingHistory.save();
    return result;
}

module.exports = {
    createBillingHistory: createBillingHistory
}