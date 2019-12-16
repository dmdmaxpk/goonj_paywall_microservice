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

// Prefetch a token for the first time
billingRepo.generateToken().then(token => {
    console.log('Token fetched!');
    config.telenor_dcb_api_token = token.access_token;
});

// RabbitMQ connection
rabbitMq = RabbitMq.rabbitMq;
rabbitMq.initializeMesssageServer((err, channel) => {
    if(err){
        console.log('Error connecting RabbitMq: ', err);
    }else{
        console.log('RabbiMq connected successfully!');
        
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
            .then(data => {
                if(data){
                    let message = data.api_response.Message;
                    if(message === 'Success'){
                        // Billed successfully
                    }else{
                        // Billing failed
                    }
                }
                console.log(data);
            }).catch(error => {
                console.log('Error: ', error.message)
            });
        });
    }
});


// Import database models
require('./models/User');
require('./models/Package');
require('./models/OTP');
require('./models/Subscriber');
require('./models/BillingHistory');
require('./models/ApiToken');


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
1. Remove first token fetch call from app.js and fetch from DB instead.
2. Update user pacakge in user and subscriber collections both once success response from telenor apis
3. Update billing dates and consecutive counts on db once successful billing is done from telenor
4. Service to check subscription after every 30 minnute for those having active auto billing;
5. grace periods - expiry - sms notifications etc
6. Maintain history as well
*/
 