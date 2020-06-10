const container = require("../configurations/container");
const billingHistoryRepo = container.resolve("billingHistoryRepository");
const userRepo = container.resolve("userRepository");subscriptionRepository
const subscriptionRepo = container.resolve("subscriptionRepository");

checkForUngrayListUsers = async() => {
    try {
        let unGrayPromiseArray = [];
        let graySubscriptions = await subscriptionRepo.getGrayListSubscriptions();
        for (let i = 0; i < graySubscriptions.length; i++){
            let promise = new Promise(async(resolve, reject) => {
                let userToUngray = await billingHistoryRepo.getUserForUnGray(graySubscriptions[i]._id);
                if(userToUngray){
                    let updated = await userRepo.updateSubscription(graySubscriptions[i]._id, 
                        {is_gray_listed: false});
                    if(updated){
                        let log = graySubscriptions[i]._id + ' marked as ungray';
                        resolve(log);
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