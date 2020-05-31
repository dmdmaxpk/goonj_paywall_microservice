const container = require("../configurations/container");
const billingHistoryRepo = container.resolve("billingHistoryRepository");
const userRepo = container.resolve("userRepository");

checkForUngrayListUsers = async() => {
    try {
        let unGrayPromiseArray = [];
        let grayUsers = await userRepo.getGraylistUsers();
        for (let i = 0; i < grayUsers.length; i++){
            let promise = new Promise(async(resolve, reject) => {
                let userToUngray = await billingHistoryRepo.getUserForUnGray(grayUsers[i]._id);
                if(userToUngray){
                    let updated = await userRepo.updateUserById(grayUsers[i]._id, {is_gray_listed: false});
                    if(updated){
                        let log = grayUsers[i]._id + ' marked as ungray';
                        resolve(log)
                    }else{
                        reject('Error in marking user as ungray');
                    }
                }
            });
            unGrayPromiseArray.push(promise);
        }

        let results = await Promise.all(unGrayPromiseArray);
        console.log(results);
    } catch(err) {
        throw err;
    }
}

module.exports = {
    checkForUngrayListUsers: checkForUngrayListUsers
}