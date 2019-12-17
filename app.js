const express = require('express');
const logger = require('morgan');
const bodyParser = require('body-parser');
const mongoSanitize = require('express-mongo-sanitize');

const mongoose = require('mongoose');
const config = require('./config');
var RabbitMq = require('./repos/queue/RabbitMq');
var billingRepo = require('./repos/BillingRepo');

const app = express();

// Middlewares
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(mongoSanitize());

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


let subscriberRepo = require('./repos/SubscriberRepo');
let billingHistoryRepo = require('./repos/BillingHistoryRepo');
let tokenRepo = require('./repos/ApiTokenRepo');
var packageRepo = require('./repos/PackageRepo');
var userRepo = require('./repos/UserRepo');

// Prefetch a token for the first time
billingRepo.generateToken().then(async(token) => {
    let updatedToken = await tokenRepo.updateToken(token.access_token);
    if(updatedToken){
        config.telenor_dcb_api_token = token.access_token;
        console.log('Token updated in db!');

        // RabbitMQ connection
        rabbitMq = RabbitMq.rabbitMq;
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
                    let messageObj = JSON.parse(response.content);
                    billingRepo.sendMessage(messageObj.message, messageObj.msisdn).then(data => {
                        console.log(data);
                    }).catch(error => {
                        console.log('Error: ', error.message)
                    });
                });

                // Subscriptin Queue
                rabbitMq.consumeQueue(config.queueNames.subscriptionDispatcher, (response) => {
                    let subscriptionObj = JSON.parse(response.content);
                    billingRepo.subscribePackage(subscriptionObj)
                    .then(async (response) => {
                        
                        let operator_response = response.api_response;
                        let message = operator_response.data.Message;
                        let user_id = response.user_id;
                        let package_id = response.packageObj._id;
                        let transaction_id = response.transactionId;

                        let billingHistoryObject = {};
                        billingHistoryObject.user_id = user_id;
                        billingHistoryObject.package_id = package_id;
                        billingHistoryObject.transaction_id = transaction_id;
                        billingHistoryObject.operator_response = operator_response;
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
                                    console.log('onSuccess - Subscriber updated');
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
                                }else if(subscriber.subscription_status === 'graced' && subscriber.auto_renewal === true){
                                    // Already had enjoyed grace time, set the subscription of this user as expire and send acknowledgement.
                                    subObj.subscription_status = 'expired';
                                    subObj.auto_renewal = false;
                                }else{
                                    subObj.subscription_status = 'not_billed';
                                }

                                subObj.consecutive_successive_bill_counts = 0;
                                let updatedSubscriber = await subscriberRepo.updateSubscriber(subscriber._id, subObj);
                                if(updatedSubscriber){
                                    console.log('onFailed - Subscriber updated');
                                }
                            }
                        }
                    }).catch((error) => {
                        console.log('Error: ', error)
                    });
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

tokenRefreshCron.runJob();
subscriptionRenewalCron.runJob();




/*
Todos:
0. Set TPS for both apis sms and subscriptions
5. grace periods - expiry - sms notifications etc
6. Maintain history as well
7. Check on over billing
8. Trial
*/
 