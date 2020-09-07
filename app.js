const express = require('express');
const logger = require('morgan');
const bodyParser = require('body-parser');
const mongoSanitize = require('express-mongo-sanitize');
const mongoose = require('mongoose');

console.log('***************************************');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

console.log('=============================:numCPUs: ', numCPUs);

if (cluster.isMaster) {
    masterProcess();
} else {
    childProcess();
}

function masterProcess() {
    console.log(`=============================:Master ${process.pid} is running`);
    console.log('=============================:isMaster: yes');
    // createChannel(), assertQueue(), sendToQueue() - RabbitMQ
    // this.createQueue(); all the types of create queues
}

function childProcess() {
    console.log(`=============================:Worker ${process.pid} started...`);
    console.log('=============================:isWorker: yes');
    // consumeQueue() - RabbitMQ workers
    // this.consumeQueue(connection); all the type of consume queues
}

console.log('***************************************');

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
const config = require('./config');
const swStats = require('swagger-stats');
const container = require('./configurations/container');
const subscriptionConsumer = container.resolve("subscriptionConsumer");

const tokenRefreshService = require('./services/TokenRefreshService');
  


// Connection to Database
mongoose.connect(config.mongoDB);
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
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(mongoSanitize());

consumeMessageQueue = async(response) => {
    try {
        let messageObj = JSON.parse(response.content);
        let countThisSec = await tpsCountRepo.getTPSCount(config.queueNames.messageDispatcher);

        if (countThisSec < config.telenor_message_api_tps) {
            billingRepo.sendMessage(messageObj.message, messageObj.msisdn)
            .then(async (data) => {
                console.log('Success:sms ',messageObj.msisdn, data);
                await tpsCountRepo.incrementTPSCount(config.queueNames.messageDispatcher);
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
                rabbitMq.createQueue(config.queueNames.subscriptionDispatcher); // to process subscription requests
                rabbitMq.createQueue(config.queueNames.subscriptionResponseDispatcher); // to consume subscription responses from worker
                
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

    //let service = require('./services/ReportsService');
    //service.generateDailyReport();
});