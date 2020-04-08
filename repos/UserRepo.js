const mongoose = require('mongoose');
const User = mongoose.model('User');
const QueueRepo = require("./QueueRepo");

createUser = async(postData) => {
    let user = new User(postData);
    let result = await user.save();
    QueueRepo.addToSubscriberQueryQueue(user.msisdn,user._id);
    return result;
}

getGraylistUsers =async() => {
    let results = await User.find({merketing_source: {$ne: 'none'}, subscription_status: 'expired', is_gray_listed: true});
    return results;
}

getPslPackageUsers = async() => {
    let results = await User.find({subscribed_package_id : {$in: ["QDfE"]} }).limit(5000);
    return results;
}

getPslOnlyPackageUsers = async() => {
    let results = await User.find({subscribed_package_id : {$in: ["QDfD"]} }).limit(5000);
    return results;
}

getUserByMsisdn =async(msisdn) => {
    result = await User.findOne({msisdn: msisdn});
    return result;
}

getUserById =async(id) => {
    let result = await User.findOne({_id: id});
    return result;
}

updateUser = async(msisdn, postData) => {
    const query = { msisdn: msisdn };
    postData.last_modified = new Date();
    const result = await User.updateOne(query, postData);
    if (result.nModified === 0) {
        return undefined;
    }else{
        let user = await getUserByMsisdn(msisdn);
        return user;
    }
}

updateUserById = async(user_id, postData) => {
    const query = { _id: user_id };
    postData.last_modified = new Date();
    const result = await User.updateOne(query, postData);
    if (result.nModified === 0) {
        return undefined;
    }else{
        let user = await getUserById(user_id);
        return user;
    }
}

deleteUser = async(user_id) => {
    const result = await User.deleteOne({_id: user_id});
    return result;
}


dailyTrialToBilledUsers = async() => {
    let today = new Date();
    today.setHours(today.getHours() - 24);
    today.setHours(0, 0, 0, 0);

    let lastTenDays = new Date();
    lastTenDays.setDate(lastTenDays.getDate() - 11);
    lastTenDays.setHours(0, 0, 0, 0);
    console.log("Query from - ", lastTenDays, ' - to ', today);

    let result = await User.aggregate([
        {
            $match:{
                $and: [{added_dtm: {$gte: new Date(lastTenDays)}}, {added_dtm: {$lt: new Date(today)}}]
            }
        },{ 
            $sort : { 
                added_dtm : -1
            }
        },{
            $lookup:{
                from: "billinghistories",
                localField: "_id",
                foreignField: "user_id",
                as: "usershistory"
            }
        }
        ]);
     return result;
}


module.exports = {
    createUser: createUser,
    getGraylistUsers: getGraylistUsers,
    getUserByMsisdn: getUserByMsisdn,
    getUserById: getUserById,
    updateUser: updateUser,
    updateUserById: updateUserById,
    deleteUser: deleteUser,
    getPslPackageUsers: getPslPackageUsers,
    getPslOnlyPackageUsers: getPslOnlyPackageUsers,
    dailyTrialToBilledUsers: dailyTrialToBilledUsers
}