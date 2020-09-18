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
                let dataToResolve = {};

                if (systemUser.password === password ) {
                    let token = jwt.sign({_id: systemUser._id,type:"system_user"}, config.secret, {expiresIn: '3 days'});
                    dataToResolve.code = config.codes.code_success;
                    dataToResolve.message = "Successfully logged in";
                    dataToResolve.access_token = token;
                    resolve(dataToResolve);
                } else {
                    dataToResolve.code = config.codes.code_data_not_found;
                    dataToResolve.message = "Invalid credentials provided";
                    resolve(dataToResolve);
                }
            } catch (error){
                let dataToResolve = {};
                dataToResolve.code = config.codes.code_error;
                dataToResolve.message = "Invalid credentials provided";
                resolve(dataToResolve);
            }
        })
    }

    
}

module.exports = SystemUserService;