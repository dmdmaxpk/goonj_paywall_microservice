const mongoose = require('mongoose');
const ViewLog = mongoose.model('ViewLog');

createViewLog = async(userId) => {
    if (userId) {
        try {
            let viewLog = new ViewLog({user_id: userId});
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
    result = await ViewLog.find({user_id: userId}).sort({added_dtm: -1}).limit(1);
    return result;
}


module.exports = {
    createViewLog: createViewLog,
    getLatestViewLog: getLatestViewLog
}