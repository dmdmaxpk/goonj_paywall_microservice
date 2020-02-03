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
require('./models/ViewLog');

var RabbitMq = require('./repos/queue/RabbitMq');
var billingRepo = require('./repos/BillingRepo');
var tpsCountRepo = require('./repos/tpsCountRepo');

const app = express();

function skipLog (req, res) {
    var url = req.originalUrl;
    if(url.includes('cron')){
      return true;
    }
    return false;
}

app.use(logger('combined', {skip: skipLog}));
//app.use(logger('dev'));


// Middlewares
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
    host: "email-smtp.eu-central-1.amazonaws.com",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: 'AKIAZQA2XAWP7CYJEJXS', // generated ethereal user
      pass: 'BJ/xUCabrqJTDU6PuLFHG0Rh1VDrp6AYAAmIOclEtzRs' // generated ethereal password
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
                rabbitMq.acknowledge(response);
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
        let subscriber = await subscriberRepo.getSubscriber(subscriptionObj.user_id);
        if (subscriber.active === true) {
            if ( subscriber.amount_billed_today > config.maximum_daily_payment_limit_pkr ) {
                await subscriberRepo.setSubcriberInactive(subscriptionObj.user_id);
                let billingHistoryObject = {};
                billingHistoryObject.user_id = subscriptionObj.user_id;
                billingHistoryObject.package_id = subscriptionObj.packageObj._id;
                billingHistoryObject.transaction_id = subscriptionObj.transaction_id;
                billingHistoryObject.operator_response = {"message": `User ${subscriptionObj.user_id} has exceeded their billing limit. Email sent.`};
                billingHistoryObject.billing_status = subscriber.subscription_status;
                billingHistoryObject.operator = 'telenor';
                let history = await billingHistoryRepo.createBillingHistory(billingHistoryObject);
                var info = await transporter.sendMail({
                    from: 'paywall@dmdmax.com.pk', // sender address
                    to: "paywall@dmdmax.com.pk", // list of receivers
                    subject: "User Billing Exceeded", // Subject line
                    text: `User ${subscriptionObj.user_id} has exceeded their billing limit. Please check. `, // plain text body
                });
            } else {
                if (countThisSec < config.telenor_subscription_api_tps) {
                    console.log("Sending subscription request to telenor");
                    await tpsCountRepo.incrementTPSCount(config.queueNames.subscriptionDispatcher);
                    billingRepo.subscribePackage(subscriptionObj)
                    .then(async (response) => {
                        console.log("Response recieved from billingRepo.subscribePackage", response);
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
                        billingHistoryObject.operator_response = response.api_response.data;
                        billingHistoryObject.billing_status = message;
                        billingHistoryObject.operator = 'telenor';
                        billingHistoryObject.price = response.packageObj.price_point_pkr;

                        let history = await billingHistoryRepo.createBillingHistory(billingHistoryObject);
                        if(history && response){
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
                                await userRepo.updateUser(msisdn, {subscription_status: subObj.subscription_status});
        
                                let updatedSubscriber = await subscriberRepo.updateSubscriber(response.user_id, subObj);
                                // TODO split code inside this condition into a separate function 
                                if(updatedSubscriber){
                                    await userRepo.updateUserById(response.user_id, {subscribed_package_id: response.packageObj._id});
                                    if(subObj.consecutive_successive_bill_counts === 1){
                                        // For the first time or every week of consecutive billing
        
                                        //Send acknowldement to user
                                        let link = 'https://www.goonj.pk/goonjplus/unsubscribe';
                                        let message = "Your Goonj TV subscription for "+response.packageObj.package_name+" has been activated at Rs. "+response.packageObj.price_point_pkr+", to unsub click the link below.\n"+link
                                        await billingRepo.sendMessage(message, msisdn);
                                    }else if(subObj.consecutive_successive_bill_counts % 7 === 0){
                                        // Every week
                                        //Send acknowldement to user
                                        let link = 'https://www.goonj.pk/goonjplus/unsubscribe';
                                        let message = "Thank you for using Goonj TV with "+response.packageObj.package_name+" at Rs. "+response.packageObj.price_point_pkr+", to unsub click the link below.\n"+link
                                        await billingRepo.sendMessage(message, msisdn);
                                    }
                                }
                            }else{
                                // Billing failed
                                await assignGracePeriodToSubscriber(subscriber,user_id);
                            }
                            let subcriberUpdated = await subscriberRepo.updateSubscriber(user_id, {queued: false})
                            if(subcriberUpdated){
                                rabbitMq.acknowledge(res);
                            }
                        }
                    }).catch(async (error) => {
                        console.log('Error: - ', error.response.data);
                         if (error.response.data.errorCode === "500.007.08"){
                            // Consider, tps exceeded, noAcknowledge will requeue this record.
                            console.log('Sending back to queue');
                            rabbitMq.noAcknowledge(res);
                            return;
                        } else {
                            // Consider, payment failed for any reason. e.g no credit, number suspended etc
                            // Enter user into grace period
                            console.log('Enter user into grace period');
                            console.log('BillingFailed - ', ' - Package - ', ' - ', (new Date()));
                            try {
                                await assignGracePeriodToSubscriber(subscriber,subscriber.user_id);
                                let subcriberUpdated = await subscriberRepo.updateSubscriber(subscriber.user_id, {queued: false});
                                if(subcriberUpdated){
                                    rabbitMq.acknowledge(res);
                                }
                                await addToHistory(subscriber.user_id,subscriptionObj.packageObj._id,subscriptionObj.transaction_id,
                                    error.response.data,error.response.data.errorMessage,'telenor',subscriptionObj.packageObj.price_point_pkr);
                            } catch(err) {
                                console.log("Error could not assign Grace period",err);
                            }

                        }
                    });
                } else {
                    console.log("TPS quota full for subscription, waiting for second to elapse - ", new Date());
                    setTimeout(() => {
                        console.log("calling consumeSusbcriptionQueue after 200 seconds");
                        consumeSusbcriptionQueue(res);
                    }, 500);
                }
            }
        } else {
            try{
                let billingHistoryObject = {};
                billingHistoryObject.user_id = subscriptionObj.user_id;
                billingHistoryObject.package_id = subscriptionObj.packageObj._id;
                billingHistoryObject.transaction_id = subscriptionObj.transaction_id;
                billingHistoryObject.operator_response = "Subscriber is not active hence payment can not be processed!";
                billingHistoryObject.billing_status = subscriber.subscription_status;
                billingHistoryObject.operator = 'telenor';
                await billingHistoryRepo.createBillingHistory([billingHistoryObject]);
            }catch(err){
                console.log(err);
            }
            console.log("Subscriber is not active hence payment can not be processed!");
            
            let subcriberUpdated = await subscriberRepo.updateSubscriber(subscriptionObj.user_id, {queued: false});
            if(subcriberUpdated){
                rabbitMq.acknowledge(res);
            }
        }
    } catch (err ) {
        console.error(err);
    }
}

async function assignGracePeriodToSubscriber(subscriber,user_id){
    return new Promise (async (resolve,reject) => {
        try {
            let subObj = {};
            // Check if this subscriber is eligible for grace period
            let user = await userRepo.getUserById(user_id);
            if(subscriber.subscription_status === 'billed' && subscriber.auto_renewal === true){
                // The subscriber is elligible for grace hours, depends on the current subscribed package
                let currentPackage = await packageRepo.getPackage({"_id": user.subscribed_package_id});
                let nextBillingDate = new Date();
                nextBillingDate.setHours(nextBillingDate.getHours() + currentPackage.package_duration);
        
                subObj.subscription_status = 'graced';
                subObj.next_billing_timestamp = nextBillingDate;
        
                //Send acknowldement to user
                let link = 'https://www.goonj.pk/goonjplus/open';
                let message = "You've been awarded a grace period of "+currentPackage.package_duration+" days. Click below link to open Goonj.\n"+link
                await billingRepo.sendMessage(message, user.msisdn);
            } else if(subscriber.subscription_status === 'graced' && subscriber.auto_renewal === true){
                // Already had enjoyed grace time, set the subscription of this user as expire and send acknowledgement.
                subObj.subscription_status = 'expired';
                subObj.auto_renewal = false;
        
                //Send acknowldement to user
                let link = 'https://www.goonj.pk/goonjplus/subscribe';
                let message = 'You package to Goonj TV has expired, click below link to subscribe again.\n'+link
                await billingRepo.sendMessage(message, user.msisdn);
            } else {
                subObj.subscription_status = 'not_billed';
                subObj.auto_renewal = false;
        
                //Send acknowldement to user
                let link = 'https://www.goonj.pk/goonjplus/subscribe';
                let message = "Failed to bill, please check your balance and try again on Goonj TV\n"+link
                await billingRepo.sendMessage(message, user.msisdn);
            }
            subObj.consecutive_successive_bill_counts = 0;
            
            await userRepo.updateUser(user.msisdn, {subscription_status: subObj.subscription_status});
            await subscriberRepo.updateSubscriber(subscriber._id, subObj);
            resolve("done");
        } catch(err) {
            console.error(err);
            reject(err);
        }
    })

}

async function addToHistory(userId,packageId,transactionId,operatorResponse,billingStatus,operator,pricePoint){
    return new Promise( async (resolve,reject) => {
        try {
            let billingHistoryObject = {};
            billingHistoryObject.user_id = userId;
            billingHistoryObject.package_id = packageId;
            billingHistoryObject.transaction_id = transactionId;
            billingHistoryObject.operator_response = operatorResponse;
            billingHistoryObject.billing_status = billingStatus;
            billingHistoryObject.operator = operator;
            billingHistoryObject.price = pricePoint;
            let history = await billingHistoryRepo.createBillingHistory(billingHistoryObject);
            resolve('done');
        }catch (er) {
            reject(er);
        }
    } );
}

const numValidation = require('./numValidation');

// Prefetch a token for the first time
billingRepo.generateToken().then(async(token) => {
    let updatedToken = await tokenRepo.updateToken(token.access_token);
    if(updatedToken){
        config.telenor_dcb_api_token = token.access_token;
        console.log('Token updated in db!');

        //numValidation.validateNumber();

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
const tpsCountService = require('./services/TpsCountService');

/*
TODO:
0. Set TPS for both apis sms and subscriptions
5. grace periods - expiry - sms notifications etc
6. Maintain history as well
7. Check on over billing
8. Trial
*/
 
