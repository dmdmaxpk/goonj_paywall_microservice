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
var nodemailer = require('nodemailer');


var transporter = nodemailer.createTransport({
    host: "mail.dmdmax.com.pk",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: 'keemut@dmdmax.com.pk', // generated ethereal user
      pass: 'Keemut@123' // generated ethereal password
    }
  });


consumeMessageQueue = async(response) => {
    try {
        let messageObj = JSON.parse(response.content);
        let countThisSec = await tpsCountRepo.getTPSCount(config.queueNames.messageDispathcer);

        if (countThisSec < config.telenor_message_api_tps) {
            console.log("Sending message request telenor");
            billingRepo.sendMessage(messageObj.message, messageObj.msisdn)
            .then(async (data) => {
                console.log('Success: ', data);
                await tpsCountRepo.incrementTPSCount(config.queueNames.messageDispathcer);
                rabbitMq.acknowledge(response);
            }).catch(error => {
                console.log('Error: ', error.message);
                consumeMessageQueue(response);
            });
        } else {
            console.log("TPS quota full for messages, waiting for second to elapse - ", new Date());
            setTimeout(() => {
                consumeMessageQueue(response);
            }, 200);
        }
    } catch (err ) {
        console.error(err);
    }
}

consumeSusbcriptionQueue = async(res) => {
    try {
        let subscriptionObj = JSON.parse(res.content);
        let countThisSec = await tpsCountRepo.getTPSCount(config.queueNames.subscriptionDispatcher);
        let amount_billed = subscriptionObj.packageObj.price_point_pkr;
        if (countThisSec < config.telenor_subscription_api_tps) {
            console.log("Sending subscription request telenor");
            billingRepo.subscribePackage(subscriptionObj)
            .then(async (response) => {
                console.log("Sending subscription request to telenor");
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
                        subObj.amount_billed_today = subscriber.amount_billed_today + amount_billed;
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
                    await tpsCountRepo.incrementTPSCount(config.queueNames.subscriptionDispatcher);
                    console.log("after payment processed: subscriber.amount_billed_today", subscriber.amount_billed_today);
                    console.log("after payment processed: config.maximum_daily_payment_limit_pkr", config.maximum_daily_payment_limit_pkr);
                    if (subscriber.amount_billed_today > config.maximum_daily_payment_limit_pkr) {
                        console.log("Caution Billing Amount exceeded");
                        // TODO set active of this subcriber to false
                        let subscriber =  await subscriberRepo.setSubcriberInactive(user_id);
                        console.log("subscriber",subscriber);
                        // TODO send email to our emails with user_id of this user and today's UTC time along with amount billed
                        console.log("send email to user with user ID ", user_id);
                        var info = await transporter.sendMail({
                            from: 'hamza@dmdmax.com.pk', // sender address
                            to: ["hamzashujaat218@gmail.com","farhan@dmdmax.com","suleiman@dmdmax.com"], // list of receivers
                            subject: "User Billing Exceeded", // Subject line
                            text: `User ${user_id} has exceeded their billing limit. Please check. `, // plain text body
                          });
                

                    }
                    rabbitMq.acknowledge(res);
                }
            }).catch((error) => {
                console.log('Error:', error.message);
                rabbitMq.acknowledge(res);
            });
        } else {
            console.log("TPS quota full for subscription, waiting for second to elapse - ", new Date());
            setTimeout(() => {
                consumeSusbcriptionQueue(res);
            }, 200);
        }
    } catch (err ) {
        console.error(err);
    }
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
                rabbitMq.consumeQueue(config.queueNames.messageDispathcer, (response) => {
                    consumeMessageQueue(response);
                });

                
                // Subscriptin Queue
                rabbitMq.consumeQueue(config.queueNames.subscriptionDispatcher, (response) => {
                    //rabbitMq.acknowledge(response);
                    consumeSusbcriptionQueue(response);
                });
            }
        });
    }
});


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
tpsCountService.runDailyAmountJob();




/*
TODO:
0. Set TPS for both apis sms and subscriptions
5. grace periods - expiry - sms notifications etc
6. Maintain history as well
7. Check on over billing
8. Trial
*/
 