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


module.exports = {
    createUser: createUser,
    getUserByMsisdn: getUserByMsisdn,
    getUserById: getUserById,
    updateUser: updateUser,
    updateUserById: updateUserById,
    deleteUser: deleteUser
}