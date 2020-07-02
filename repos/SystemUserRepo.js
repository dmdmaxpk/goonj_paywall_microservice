const mongoose = require('mongoose');
const SystemUser = mongoose.model('SystemUser');
const moment = require("moment");

class SystemUserRepository {
    constructor({}){
    }

    async getUser (username)  {
        let result = await SystemUser.findOne({username:username});
        if(result){
            return result;
        }else{
            let data = `Unable to find User ${username}`;
            console.log(data);
            throw Error(data);
        }
    }
    
}







module.exports = SystemUserRepository;