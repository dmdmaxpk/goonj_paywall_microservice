const mongoose = require('mongoose');
const AuthToken = mongoose.model('AuthToken');


class AuthRepository {
    constructor(){
    }

    async createOrUpdate(postData) {
        let existingToken = await this.getByMsisdn(postData.msisdn);
        if(existingToken){
            this.update(postData.msisdn, postData.auth_token);
            return;
        }
        
        let token = new AuthToken(postData);
        await token.save();
    }

    async update(msisdn, auth_token) {
        return await AuthToken.update({msisdn: msisdn}, {$set: {auth_token: auth_token}});
    }

    async getByMsisdn(msisdn) {
        return await AuthToken.findOne({msisdn: msisdn});
    }

    async getByAuthToken(token) {
        return await AuthToken.findOne({auth_token: token});
    }
}

module.exports = AuthRepository;