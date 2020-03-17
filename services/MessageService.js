const messageRepo = require('../repos/MessageRepo');
const userRepo = require('../repos/UserRepo');
const billinghistoryRepo = require('../repos/BillingHistoryRepo');

changePackageOfUsers = async() => {
    try {
        let users = await userRepo.getPslPackageUsers();
        users.forEach(async (user) => {
            console.log("processing",user._id);
            if (user.subscription_status === "expired" || user.subscription_status === "not_billed") {
                // TODO just change user package do not send message set is PackageChanged boolean to true
                console.log("changed package id for user: ",user._id);
                await userRepo.updateUserById(user._id,{is_package_changed: true,subscribed_package_id: "QDfC"});
                let billinghistory = {
                    user_id: user._id,
                    source: user.source,
                    billing_status: "changed_package_on_tp_request"
                }
                billinghistoryRepo.createBillingHistory(billinghistory);
            } else if (user.subscription_status === "graced" || user.subscription_status === "billed" || user.subscription_status === "trial" ) {
                // TODO change user package and also send  message set is package changed and isMessageSet Boolean to true
                console.log("sent message and changed package id for user: ",user._id);
                await userRepo.updateUserById(user._id,{is_package_changed: true,is_message_sent:true,subscribed_package_id: "QDfC"});
                let billinghistory = {
                    user_id: user._id,
                    source: user.source,
                    billing_status: "changed_package_on_tp_request"
                }
                billinghistoryRepo.createBillingHistory(billinghistory);
                let link = `https://www.goonj.pk/goonjplus/unsubscribe?uid=${user._id}`;
                let text = `Moaziz Sarif, Goonj ke loyal customer honay par aap ko Live TV ab PSL ki price par diya ja raha hai.Unsubscribe karnay ke liyje link par click karein \n ${link}`;
                messageRepo.sendSmsToUser(text,user.msisdn);
            }
        });
    } catch(err) {
        throw err;
    }
}

module.exports = {
    changePackageOfUsers: changePackageOfUsers
}