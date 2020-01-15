const mongoose = require('mongoose');
const BillingHistory = mongoose.model('BillingHistory');
const config = require('../config');

createBillingHistory = async(postData) => {
    let billingHistory = new BillingHistory(postData);
    let result = await billingHistory.save();
    return result;
}

getUserForUnGray = async(user_id) => {
    let dayToCompare = new Date();
    dayToCompare = dayToCompare.setHours(dayToCompare.getHours() - config.max_graylist_time_in_hrs);
    
    let records = await BillingHistory.findOne({user_id: user_id, "billing_status": "unsubscribe-request-recieved", "billing_dtm": {$lte: dayToCompare}}, null, {sort: {billing_dtm: -1}});
    return records;
}

module.exports = {
    createBillingHistory: createBillingHistory,
    getUserForUnGray: getUserForUnGray
}