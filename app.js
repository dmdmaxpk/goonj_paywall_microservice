const express = require('express');
const logger = require('morgan');
const bodyParser = require('body-parser');
const mongoSanitize = require('express-mongo-sanitize');
const mongoose = require('mongoose');
const fileupload = require('express-fileupload');

// Import database models
require('./models/User');
require('./models/Package');
require('./models/OTP');
require('./models/Subscriber');
require('./models/BillingHistory');
require('./models/ApiToken');
require('./models/TpsCount');
require('./models/ViewLog');
require('./models/BlockedUsers');
require('./models/ChargingAttempt');
require('./models/Paywall');
require('./models/Subscription');
require('./models/Migration');
require('./models/SystemUser');
require('./models/DuplicateMsisdn');
require('./models/AuthToken');

const config = require('./config');
const swStats = require('swagger-stats');
const container = require('./configurations/container');
const subscriptionConsumer = container.resolve("subscriptionConsumer");

const tokenRefreshService = require('./services/TokenRefreshService');
  


// Connection to Database
mongoose.connect(config.mongoDB, {useUnifiedTopology: true, useCreateIndex: true, useNewUrlParser: true});
mongoose.connection.on('error', err => console.error(`Error: ${err.message}`));

var RabbitMq = require('./repos/queue/RabbitMq');
var billingRepo = container.resolve("billingRepository");
var tpsCountRepo = container.resolve("tpsCountRepository");

// let remvDupMsObj = container.resolve("removeDuplicateMsisdns");
// remvDupMsObj.removeDuplicateMsisdns();


const app = express();

function skipLog (req, res) {
    var url = req.originalUrl;
    if(url.includes('cron') || url.includes('swagger-stats')){
      return true;
    }
    return false;
}

app.use(logger('combined', {skip: skipLog}));
//app.use(logger('dev'));

app.use(swStats.getMiddleware({}));

// Middlewares
app.use(fileupload());
app.use(bodyParser.json({limit: '5120kb'}));  //5MB
app.use(bodyParser.urlencoded({ extended: false }));
app.use(mongoSanitize());

consumeSubscriptionQueue = async(response) => {
    await subscriptionConsumer.consume(response);
}


// Prefetch a token for the first time
billingRepo.generateToken().then(async(token) => {
    console.log('Token Fetched from TP', token);
    await tokenRefreshService.updateToken(token.access_token);

    if(token.access_token){
        
        // RabbitMQ connection
        rabbitMq  = RabbitMq.rabbitMq;
        rabbitMq.initializeMessageServer((err, channel) => {
            if(err){
                console.log('Error connecting RabbitMq: ', err);
            }else{
                console.log('RabbitMQ connected successfully!');
            
                // Let's create queues
                rabbitMq.createQueue(config.queueNames.subscriptionResponseDispatcher);

                // Subscription queue consumer
                rabbitMq.consumeQueue(config.queueNames.subscriptionResponseDispatcher, (response) => {
                    consumeSubscriptionQueue(response);
                });
            }
        });
    }       
}).catch(err => {
    console.log('Error while fetching token', err);
});

// Import routes
app.use('/', require('./routes/index'));

// Start Server
let { port } = config;
app.listen(port, () => {
    console.log(`APP running on port ${port}`);
});