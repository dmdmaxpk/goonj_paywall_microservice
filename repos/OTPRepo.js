const mongoose = require('mongoose');
const OTP = mongoose.model('Otp');

createOtp = async(postData) => {
    let otp = new OTP(postData);
    let result = await otp.save();
    return result;
}

getOtp = async(msisdn) => {
    result = await OTP.findOne({msisdn: msisdn});
	return result;
}

updateOtp = async(msisdn, postData) => {
    const query = { msisdn: msisdn };
    postData.last_modified = new Date();
    
    const result = await OTP.updateOne(query, postData);
    if (result.nModified === 0) {
        return undefined;
    }else{
        let otp = await getOtp(msisdn);
        return otp;
    }
}

deleteUser = async(msisdn) => {
    const result = await OTP.deleteOne({msisdn: msisdn});
    return result;
}

module.exports = {
    createOtp: createOtp,
    getOtp: getOtp,
    updateOtp: updateOtp,
    deleteUser: deleteUser
}