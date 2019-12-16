const mongoose = require('mongoose');
const User = mongoose.model('User');

createUser = async(postData) => {
    let user = new User(postData);
    let result = await user.save();
    return result;
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
        let user = await getUser(msisdn);
        return user;
    }
}

deleteUser = async(msisdn) => {
    const result = await User.deleteOne({msisdn: msisdn});
    return result;
}


module.exports = {
    createUser: createUser,
    getUserByMsisdn: getUserByMsisdn,
    getUserById: getUserById,
    updateUser: updateUser,
    deleteUser: deleteUser
}