const mongoose = require('mongoose');
const AuthToken = mongoose.model('AuthToken');


class AuthRepository {
    constructor(){
    }

    async create(postData) {
        let token = new AuthToken(postData);
        let result = await token.save();
        return result;
    }
    
    async getByUserId(user_id) {
        return await AuthToken.findOne({user_id: user_id});
    }

    async getByMsisdn(msisdn) {
        return await AuthToken.findOne({msisdn: msisdn});
    }

    async getByAuthToken(token) {
        return await AuthToken.findOne({auth_token: token});
    }
}

module.exports = AuthRepository;