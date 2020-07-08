const config = require("../config");
let jwt = require('jsonwebtoken');

class SystemUserService {
    constructor({systemUserRepository}) {
        this.systemUserRepository = systemUserRepository;
    }

    async login(username,password){
        return new Promise(async (resolve,reject) => {
            try {
                let systemUser = await this.systemUserRepository.getUser(username);
                console.log("System user",systemUser.password,password);
                if (systemUser.password === password ) {
                    let token = jwt.sign({_id: systemUser._id,type:"system_user"}, config.secret, {expiresIn: '3 days'});
					resolve({access_token:token});
                } else {
                    resolve({data:"Incorrect credentials"});
                }
            } catch (error){
                reject(error);
            }
        })
    }

    
}

module.exports = SystemUserService;