const express = require('express');
const logger = require('morgan');
const bodyParser = require('body-parser');
const mongoSanitize = require('express-mongo-sanitize');
const mongoose = require('mongoose');
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
const config = require('./config');
const swStats = require('swagger-stats');
const container = require('./configurations/container');
const subscriptionConsumer = container.resolve("subscriptionConsumer");
  


// Connection to Database
mongoose.connect(config.mongoDB);
mongoose.connection.on('error', err => console.error(`Error: ${err.message}`));

var RabbitMq = require('./repos/queue/RabbitMq');
var billingRepo = container.resolve("billingRepository");
var tpsCountRepo = container.resolve("tpsCountRepository");
var balanceCheckConsumer = require('./repos/queue/consumers/BalanceCheckConsumer');
let tokenRepo = require('./repos/ApiTokenRepo');


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
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(mongoSanitize());


consumeMessageQueue = async(response) => {
    try {
        let messageObj = JSON.parse(response.content);
        let countThisSec = await tpsCountRepo.getTPSCount(config.queueNames.messageDispathcer);

        if (countThisSec < config.telenor_message_api_tps) {
            billingRepo.sendMessage(messageObj.message, messageObj.msisdn)
            .then(async (data) => {
                console.log('Success:sms ',messageObj.msisdn, data);
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

consumeBalanceCheckQueue = async(response) => {
    try {
        let subscriber = JSON.parse(response.content);
        
        let countThisSec = await tpsCountRepo.getTPSCount(config.queueNames.balanceCheckDispatcher);
        if (countThisSec < config.balance_check_api_tps) {
            console.log("Sending Balance Check Request To Telenor - Subscriber ", subscriber._id);
            
            balanceCheckConsumer.microChargingAttempt(subscriber)
            .then(async (data) => {
                console.log('Success: ', data);
                await tpsCountRepo.incrementTPSCount(config.queueNames.balanceCheckDispatcher);
                rabbitMq.acknowledge(response);
            }).catch(async(error) => {
                console.log('Error: ', error.message);
                await tpsCountRepo.incrementTPSCount(config.queueNames.balanceCheckDispatcher);
                rabbitMq.acknowledge(response);
            });
            
        } else {
            console.log("TPS quota full for balance check, waiting for ms to elapse - ", new Date());
            setTimeout(() => {
                consumeBalanceCheckQueue(response);
            }, 500);
        }
    } catch (err ) {
        console.error(err);
    }
}

consumeSubscriptionQueue = async(response) => {
    await subscriptionConsumer.consume(response);
}


// Prefetch a token for the first time
billingRepo.generateToken().then(async(token) => {
    console.log('Token Fetched', token);
    let currentToken = await tokenRepo.getToken();
    if(currentToken){
        currentToken = await tokenRepo.updateToken(token.access_token);
    }else{
        currentToken = await tokenRepo.createToken({token:token.access_token});
    }
    
    console.log(currentToken);
    if(currentToken){
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
                rabbitMq.createQueue(config.queueNames.balanceCheckDispatcher); // to process balance check requests

                //Let's start queue consumption
                // Messaging Queue
                rabbitMq.consumeQueue(config.queueNames.messageDispathcer, (response) => {
                    consumeMessageQueue(response);
                });
                
                // Subscriptin Queue
                rabbitMq.consumeQueue(config.queueNames.subscriptionDispatcher, (response) => {
                    consumeSubscriptionQueue(response);
                });

                 // Balance Check Queue
                 rabbitMq.consumeQueue(config.queueNames.balanceCheckDispatcher, (response) => {
                    consumeBalanceCheckQueue(response);
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

    //let service = require('./services/ReportsService');
    //service.generateDailyReport();
});