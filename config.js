const env = process.env.NODE_ENV || 'development';

// application gets environment from either system envs or from this file in above line.

const telenor_message_api_tps = 5;
const telenor_subscription_api_tps = 5;

const codes = {
    code_error: -1,
    code_success: 0,
    code_record_added: 1,
    code_record_updated: 2,
    code_record_deleted: 3,

    code_invalid_data_provided: 4,
    code_record_already_added: 5,
    code_data_not_found: 6,

    code_otp_validated: 7,
    code_otp_not_validated: 8,
    code_already_subscribed: 9,
    code_in_billing_queue: 10
}


const subscription_status = {
    status_subscribed: "subscribed",
    status_not_subscribed: "not_subscribed",
    status_expired: "expired",
    status_graced: "grace"
}

const queueNames = {
    messageDispathcer: 'messageDispathcer',
    subscriptionDispatcher: 'subscriptionDispatcher'
}

// Telenor DCB API's configs
const telenor_dcb_api_baseurl = 'https://apis.telenor.com.pk/';
const telenor_dcb_api_token = '';

let config = {
    development: {
        port: '5000',
        mongoDB: 'mongodb://localhost:27017/goonjpaywall',
        rabbitMq: 'amqp://localhost',
        queueNames: queueNames,
        telenor_dcb_api_baseurl: telenor_dcb_api_baseurl,
        telenor_dcb_api_token: telenor_dcb_api_token,
        codes: codes,
        subscription_status: subscription_status,
        telenor_message_api_tps: telenor_message_api_tps,
        telenor_subscription_api_tps: telenor_subscription_api_tps
    },
    staging: {
        port: '5000',
        mongoDB: 'mongodb://localhost:27017/goonjpaywall',
        rabbitMq: 'amqp://localhost',
        queueNames: queueNames,
        telenor_dcb_api_baseurl: telenor_dcb_api_baseurl,
        telenor_dcb_api_token: telenor_dcb_api_token,
        codes: codes,
        subscription_status: subscription_status,
        telenor_message_api_tps: telenor_message_api_tps,
        telenor_subscription_api_tps: telenor_subscription_api_tps
    },
    production: {
        port: '5000',
        mongoDB: 'mongodb://localhost:27017/goonjpaywall',
        rabbitMq: 'amqp://localhost',
        queueNames: queueNames,
        telenor_dcb_api_baseurl: telenor_dcb_api_baseurl,
        telenor_dcb_api_token: telenor_dcb_api_token,
        codes: codes,
        subscription_status: subscription_status,
        telenor_message_api_tps: telenor_message_api_tps,
        telenor_subscription_api_tps: telenor_subscription_api_tps
    }
};

console.log("---", env);

if (env === 'development') config = config.development;
if (env === 'staging') config = config.staging;
if (env === 'production') config = config.production;

module.exports = config;
