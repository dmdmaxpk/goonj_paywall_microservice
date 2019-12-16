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
            console.log(response.content);
            let messageObj = JSON.parse(response.content);
            console.log(messageObj);

            billingRepo.sendMessage(messageObj.message, messageObj.msisdn).then(data => {
                console.log(data.message);
            }).catch(error => {
                console.log('Error: ', error.message)
            });
        });

        // Subscriptin Queue
        rabbitMq.consumeQueue(config.queueNames.subscriptionDispatcher, (response, err) => {
            if(err){
                console.log('Queue consumption error', err)
            }else{
                let subscriptionObj = JSON.parse(response.content);
                billingRepo.subscribePackage(subscriptionObj)
                .then(data => {
                    console.log(data);
                }).catch(error => {
                    console.log('Error: ', error.message)
                });
            }
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

// Cron Job
const tokenRefreshCron = require('./services/TokenRefreshService');
tokenRefreshCron.runJob();




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
 