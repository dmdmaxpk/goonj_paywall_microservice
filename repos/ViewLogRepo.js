const mongoose = require('mongoose');
const ViewLog = mongoose.model('ViewLog');

createViewLog = async(userId, subscriptionId) => {
    if (userId) {
        try {
            let viewLog = new ViewLog({user_id: userId,subscription_id: subscriptionId, added_dtm: new Date()});
            let result = await viewLog.save();
            return result;
        } catch(error) {
            throw new Error(error.message);
            return error;
        }
    } else {
        throw new Error("[createViewLog]: userId is required");
        return undefined;
    }
}

getLatestViewLog =async(userId) => {
    try {
        result = await ViewLog.findOne({user_id: userId}).sort({added_dtm: -1});
        return result;
    } catch(erro) {
        throw new Error(error.message); 
    }
}

getNumberOfViewLogs =async(userId) => {
    try {
        result = await ViewLog.countDocuments({user_id: userId});
        return result;
    } catch(erro) {
        throw new Error(error.message); 
    }
}


module.exports = {
    createViewLog: createViewLog,
    getLatestViewLog: getLatestViewLog,
    getNumberOfViewLogs: getNumberOfViewLogs
}