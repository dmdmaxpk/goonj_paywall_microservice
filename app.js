const express = require('express');
const logger = require('morgan');
const bodyParser = require('body-parser');
const mongoSanitize = require('express-mongo-sanitize');
const mongoose = require('mongoose');
const config = require('./config');

// Connection to Database
mongoose.connect(config.mongoDB);
mongoose.connection.on('error', err => console.error(`Error: ${err.message}`));

// Import database models
require('./models/User');
require('./models/Package');
require('./models/OTP');
require('./models/Subscriber');
require('./models/BillingHistory');
require('./models/ApiToken');
require('./models/TpsCount');

var RabbitMq = require('./repos/queue/RabbitMq');
var billingRepo = require('./repos/BillingRepo');
var tpsCountRepo = require('./repos/tpsCountRepo');

const app = express();

// Middlewares
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(mongoSanitize());


let subscriberRepo = require('./repos/SubscriberRepo');
let billingHistoryRepo = require('./repos/BillingHistoryRepo');
let tokenRepo = require('./repos/ApiTokenRepo');
var packageRepo = require('./repos/PackageRepo');
var userRepo = require('./repos/UserRepo');

async function consumeMessageQueue(msgData,response){
    try {
        let messageCountThisSecond = await tpsCountRepo.getTPSCount("message");
        console.log(messageCountThisSecond, "---++---", config.messageDispatcherCount );
        console.log(msgData.message, "xxxxxx", msgData.msisdn );
        if (messageCountThisSecond < config.messageDispatcherCount) {
            billingRepo.sendMessage(msgData.message, msgData.msisdn).then(async (data) => {
                console.log("Request Sent to Telenor");
                let increased =  await tpsCountRepo.incrementTPSCount("message");
                rabbitMq.acknowldegeMessage(response);
            }).catch(error => {
                console.log('Error: ', error.message);
                rabbitMq.acknowldegeMessage(response);
            });
        } else {
            // console.log("TPS Quota Filled for this second Waiting for second to elapse",new Date());
            setTimeout(() => {
                consumeMessageQueue(msgData,response);
            }, 100);
        }
    } catch (err ) {
        console.error(err);
    };
}

// Prefetch a token for the first time
billingRepo.generateToken().then(async(token) => {
    let updatedToken = await tokenRepo.updateToken(token.access_token);
    if(updatedToken){
        config.telenor_dcb_api_token = token.access_token;
        console.log('Token updated in db!');

        // RabbitMQ connection
        rabbitMq  = RabbitMq.rabbitMq;
        rabbitMq.initializeMesssageServer((err, channel) => {
            if(err){
                console.log('Error connecting RabbitMq: ', err);
            }else{
                console.log('RabbitMQ connected successfully!');
                
                // Let's create queues
                rabbitMq.createQueue(config.queueNames.messageDispathcer); // to dispatch messages like otp/subscription message/un-sub message etc
                rabbitMq.createQueue(config.queueNames.subscriptionDispatcher); // to process subscription requests

                //Let's start queue consumption

                // Messaging Queue
                let messageCount = 0;
                rabbitMq.consumeQueue(config.queueNames.messageDispathcer, (response) => {
                    messageCount++;
                    let messageObj = JSON.parse(response.content);
                    
                    // billingRepo.sendMessage(messageObj.message, messageObj.msisdn).then(data => {
                    //     console.log(data);
                    // }).catch(error => {
                    //     console.log('Error: ', error.message)
                    // });
                    // console.log("message received",messageObj);
                    consumeMessageQueue(messageObj,response);

                    /*if(messageCount === config.telenor_message_api_tps){
                        setTimeout(() => {
                            messageCount = 0;
                            rabbitMq.acknowledge(response);
                        }, 1500);
                    }else{
                        rabbitMq.acknowledge(response);
                    }*/
                });

                
                // Subscriptin Queue
                let subscriptionCount = 0;
                rabbitMq.consumeQueue(config.queueNames.subscriptionDispatcher, (response) => {
                    subscriptionCount++;
                    chargeUser(response);
                    
                    if(subscriptionCount === config.telenor_subscription_api_tps){
                        setTimeout(() => {
                            subscriptionCount = 0;
                            rabbitMq.acknowledge(response);
                        }, 1500);
                    }else{
                        rabbitMq.acknowledge(response);
                    }
                });
            }
        });
    }
});

// Helper
chargeUser = async(request) => {
    let subscriptionObj = JSON.parse(request.content);
    billingRepo.subscribePackage(subscriptionObj)
    .then(async (response) => {
        
        let operator_response = response.api_response;
        let message = operator_response.data.Message;
        let user_id = response.user_id;
        let package_id = response.packageObj._id;
        let transaction_id = response.transactionId;
        let msisdn = response.msisdn;

        let billingHistoryObject = {};
        billingHistoryObject.user_id = user_id;
        billingHistoryObject.package_id = package_id;
        billingHistoryObject.transaction_id = transaction_id;
        billingHistoryObject.operator_response = operator_response.toString();
        billingHistoryObject.billing_status = message;
        billingHistoryObject.operator = 'telenor';
        console.log('Billing history', billingHistoryObject);
        let history = await billingHistoryRepo.createBillingHistory(billingHistoryObject);

        if(history && response){
            let subscriber = await subscriberRepo.getSubscriber(response.user_id);

            if(message === 'Success'){
                // Billed successfully
                console.log('BillingSuccess - ', response.msisdn, ' - Package - ', response.packageObj._id, ' - ', (new Date()));
                let nextBilling = new Date();
                nextBilling.setHours(nextBilling.getHours() + response.packageObj.package_duration);

                let subObj = {};
                subObj.subscription_status = 'billed';
                subObj.auto_renewal = true;
                subObj.last_billing_timestamp = new Date();
                subObj.next_billing_timestamp = nextBilling;
                subObj.total_successive_bill_counts = ((subscriber.total_successive_bill_counts ? subscriber.total_successive_bill_counts : 0) + 1);
                subObj.consecutive_successive_bill_counts = ((subscriber.consecutive_successive_bill_counts ? subscriber.consecutive_successive_bill_counts : 0) + 1);
                let updatedSubscriber = await subscriberRepo.updateSubscriber(response.user_id, subObj);
                if(updatedSubscriber){
                    await userRepo.updateUserById(response.user_id, {subscribed_package_id: response.packageObj._id});
                    if(subObj.consecutive_successive_bill_counts === 1){
                        // For the first time or every week of consecutive billing

                        //Send acknowldement to user
                        let link = 'https://www.goonj.pk/goonjplus/unsubscribe';
                        let message = "Your Goonj+ subscription for "+response.packageObj.package_name+" has been activated at Rs. "+response.packageObj.price_point_pkr+", to unsub click the link below.\n"+link
                        await billingRepo.sendMessage(message, msisdn);
                    }else if(subObj.consecutive_successive_bill_counts % 7 === 0){
                        // Every week
                        //Send acknowldement to user
                        let link = 'https://www.goonj.pk/goonjplus/unsubscribe';
                        let message = "Thank you for using Goonj+ with "+response.packageObj.package_name+" at Rs. "+response.packageObj.price_point_pkr+", to unsub click the link below.\n"+link
                        await billingRepo.sendMessage(message, msisdn);
                    }
                }
            }else{
                // Billing failed
                console.log('BillingFailed - ', response.msisdn, ' - Package - ', response.packageObj._id, ' - ', (new Date()));
                let subObj = {};

                // Check if this subscriber is eligible for grace period
                if(subscriber.subscription_status === 'billed' && subscriber.auto_renewal === true){
                    // The subscriber is elligible for grace hours, depends on the current subscribed package
                    let user = await userRepo.getUserById(response.user_id);
                    let currentPackage = await packageRepo.getPackage(user.subscribed_package_id);
                    let nextBillingDate = new Date();
                    nextBillingDate.setHours(nextBilling.getHours() + currentPackage.package_duration);

                    subObj.subscription_status = 'graced';
                    subObj.next_billing_timestamp = nextBillingDate;

                    //Send acknowldement to user
                    let link = 'https://www.goonj.pk/goonjplus/open';
                    let message = "You've been awarded a grace period of "+currentPackage.package_duration+" days. Click below link to open Goonj.\n"+link
                    await billingRepo.sendMessage(message, msisdn);
                }else if(subscriber.subscription_status === 'graced' && subscriber.auto_renewal === true){
                    // Already had enjoyed grace time, set the subscription of this user as expire and send acknowledgement.
                    subObj.subscription_status = 'expired';
                    subObj.auto_renewal = false;

                    //Send acknowldement to user
                    let link = 'https://www.goonj.pk/goonjplus/subscribe';
                    let message = 'You package to Goonj+ has expired, click below link to subscribe again.\n'+link
                    await billingRepo.sendMessage(message, msisdn);
                }else{
                    subObj.subscription_status = 'not_billed';
                    subObj.auto_renewal = false;

                    //Send acknowldement to user
                    let link = 'https://www.goonj.pk/goonjplus/subscribe';
                    let message = "Failed to bill, please check your balance and try again on Goonj+\n"+link
                    await billingRepo.sendMessage(message, msisdn);
                }

                subObj.consecutive_successive_bill_counts = 0;
                await subscriberRepo.updateSubscriber(subscriber._id, subObj);
            }
        }
    }).catch((error) => {
        console.log('Error: ', error.message);
    });
}


// Import routes
app.use('/', require('./routes/index'));

// Start Server
let { port } = config;
app.listen(port, () => console.log(`APP running on port ${port}`));

// Cron Jobs
const tokenRefreshCron = require('./services/TokenRefreshService');
const subscriptionRenewalCron = require('./services/SubscriptionRenewalService');
const tpsCountService = require('./services/tpsCountService');

tokenRefreshCron.runJob();
subscriptionRenewalCron.runJob();
tpsCountService.runJob();




/*
TODO:
0. Set TPS for both apis sms and subscriptions
5. grace periods - expiry - sms notifications etc
6. Maintain history as well
7. Check on over billing
8. Trial
*/
 