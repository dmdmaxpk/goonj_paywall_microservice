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
    code_in_billing_queue: 10,
    code_trial_activated: 11
}
const maximum_daily_payment_limit_pkr = 100;
const hours_of_trial_period = 24;
const is_trial_functionality_activated = true;
const max_time_in_hours_since_last_viewed_by_user_after_which_to_unsubscribe = 336; // 2 weeks

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
        telenor_message_api_tps: telenor_message_api_tps,
        telenor_subscription_api_tps: telenor_subscription_api_tps,
        trial_hours: hours_of_trial_period,
        is_trial_active: is_trial_functionality_activated,
        maximum_daily_payment_limit_pkr: maximum_daily_payment_limit_pkr,
        unsub_time_limit: max_time_in_hours_since_last_viewed_by_user_after_which_to_unsubscribe

    },
    staging: {
        port: '5000',
        mongoDB: 'mongodb://localhost:27017/goonjpaywall',
        rabbitMq: 'amqp://localhost',
        queueNames: queueNames,
        telenor_dcb_api_baseurl: telenor_dcb_api_baseurl,
        telenor_dcb_api_token: telenor_dcb_api_token,
        codes: codes,
        telenor_message_api_tps: telenor_message_api_tps,
        telenor_subscription_api_tps: telenor_subscription_api_tps,
        trial_hours: hours_of_trial_period,
        is_trial_active: is_trial_functionality_activated,
        maximum_daily_payment_limit_pkr: maximum_daily_payment_limit_pkr,
        unsub_time_limit: max_time_in_hours_since_last_viewed_by_user_after_which_to_unsubscribe
    },
    production: {
        port: process.env.PW_PORT,
        mongoDB: process.env.PW_MONGO_DB_URL,
        rabbitMq: process.env.PW_RABBIT_MQ,
        queueNames: queueNames,
        telenor_dcb_api_baseurl: telenor_dcb_api_baseurl,
        telenor_dcb_api_token: telenor_dcb_api_token,
        codes: codes,
        telenor_message_api_tps: telenor_message_api_tps,
        telenor_subscription_api_tps: telenor_subscription_api_tps,
        trial_hours: hours_of_trial_period,
        is_trial_active: is_trial_functionality_activated,
        maximum_daily_payment_limit_pkr: maximum_daily_payment_limit_pkr,
        unsub_time_limit: max_time_in_hours_since_last_viewed_by_user_after_which_to_unsubscribe
    }
};

console.log("---", env);

if (env === 'development') config = config.development;
if (env === 'staging') config = config.staging;
if (env === 'production') config = config.production;

module.exports = config;
