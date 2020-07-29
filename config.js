const env = process.env.NODE_ENV || 'development';

// application gets environment from either system envs or from this file in above line.
// Total tps is 40 for now but we need to increase this
const telenor_message_api_tps = 5;
const telenor_subscription_api_tps = 25;
const telenor_subscriber_query_api_tps = 10;
const telenor_free_mbs_api_tps = 0;
const balance_check_api_tps = 0;

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
    code_trial_activated: 11,
    code_user_gralisted: 12,
    code_user_blacklisted: 13,
    code_auth_failed: 14,
    code_auth_token_not_supplied: 15,
    code_already_in_queue: 16,
    code_otp_not_found: 17
}

const max_graylist_time_in_hrs = 336; // 2 weeks
const maximum_daily_payment_limit_pkr = 20;
const hours_of_trial_period = 24;
const is_trial_functionality_activated = true;
const max_time_in_hours_since_last_viewed_by_user_after_which_to_unsubscribe = 720; // 2 weeks
const hours_on_which_to_run_renewal_cycle = [1,5,9,13,18,21];
const default_package_id = "QDfC";

const queueNames = {
    messageDispathcer: 'messageDispathcer',
    subscriptionDispatcher: 'subscriptionDispatcher',
    subscriberQueryDispatcher: 'subscriberQueryDispatcher',
    balanceCheckDispatcher: 'balanceCheckDispatcher',
    freeMbsDispatcher: 'freeMbsDispatcher'
}
// Telenor DCB API's configs
const telenor_dcb_api_baseurl = 'https://apis.telenor.com.pk/';
const telenor_dcb_api_token = '';

//Ideation Url
const Ideation_call_back_url = 'http://bpd.o18.click/';
const Ideation_call_back_url_2 = 'http://210.56.13.190/goonj_callback.php/';
const Ideation_call_back_url_3 = `https://postback.level23.nl/?currency=USD&handler=10821&hash=c4e51373f0d516d0d4fdbd7f0e544c61&tracker=`;
const time_between_billing_attempts_hours = 8;
const he_service_pass_phrase = "fdkPmW8yOX";

let config = {
    development: {
        port: '5000',
        mongoDB: 'mongodb://localhost:27017/goonjpaywall',
        rabbitMq: 'amqp://localhost',
        queueNames: queueNames,
        telenor_dcb_api_baseurl: telenor_dcb_api_baseurl,
        telenor_dcb_api_token: telenor_dcb_api_token,
        ideation_callback_url: Ideation_call_back_url,
        ideation_callback_url2: Ideation_call_back_url_2,
        ideation_callback_url3: Ideation_call_back_url_3,
        time_between_billing_attempts_hours: time_between_billing_attempts_hours,
        codes: codes,
        telenor_message_api_tps: telenor_message_api_tps,
        telenor_subscription_api_tps: telenor_subscription_api_tps,
        telenor_subscriber_query_api_tps: telenor_subscriber_query_api_tps,
        balance_check_api_tps: balance_check_api_tps,
        telenor_free_mbs_api_tps: telenor_free_mbs_api_tps,
        trial_hours: hours_of_trial_period,
        is_trial_active: is_trial_functionality_activated,
        maximum_daily_payment_limit_pkr: maximum_daily_payment_limit_pkr,
        unsub_time_limit: max_time_in_hours_since_last_viewed_by_user_after_which_to_unsubscribe,
        max_graylist_time_in_hrs: max_graylist_time_in_hrs,
        hours_on_which_to_run_renewal_cycle: hours_on_which_to_run_renewal_cycle,
        logger_url: "http://127.0.0.1:8000/",
        secret: "MVPUBRY2IV",
        emailhost:"mail.dmdmax.com.pk",
        emailUsername: "reports@goonj.pk",
        emailPassword: "YiVmeCPtzJn39Mu",
        emailPort: 465,
        emailSecure: true,
        default_package_id: default_package_id,
        he_service_pass_phrase: he_service_pass_phrase
    },
    staging: {
        port: '5000',
        mongoDB: 'mongodb://mongodb:27017/goonjpaywall',
        rabbitMq: 'amqp://rabbitmq',
        queueNames: queueNames,
        telenor_dcb_api_baseurl: telenor_dcb_api_baseurl,
        telenor_dcb_api_token: telenor_dcb_api_token,
        ideation_callback_url: Ideation_call_back_url,
        ideation_callback_url2: Ideation_call_back_url_2,
        ideation_callback_url3: Ideation_call_back_url_3,
        time_between_billing_attempts_hours: time_between_billing_attempts_hours,
        codes: codes,
        telenor_message_api_tps: telenor_message_api_tps,
        telenor_subscription_api_tps: telenor_subscription_api_tps,
        telenor_subscriber_query_api_tps: telenor_subscriber_query_api_tps,
        balance_check_api_tps: balance_check_api_tps,
        telenor_free_mbs_api_tps: telenor_free_mbs_api_tps,
        trial_hours: hours_of_trial_period,
        is_trial_active: is_trial_functionality_activated,
        maximum_daily_payment_limit_pkr: maximum_daily_payment_limit_pkr,
        unsub_time_limit: max_time_in_hours_since_last_viewed_by_user_after_which_to_unsubscribe,
        max_graylist_time_in_hrs: max_graylist_time_in_hrs,
        hours_on_which_to_run_renewal_cycle: hours_on_which_to_run_renewal_cycle,
        logger_url: "http://127.0.0.1:8000/",
        secret: "MVPUBRY2IV",
        emailhost:"mail.dmdmax.com.pk",
        emailUsername: "reports@goonj.pk",
        emailPassword: "YiVmeCPtzJn39Mu",
        emailPort: 465,
        emailSecure: true,
        default_package_id: default_package_id,
        he_service_pass_phrase: he_service_pass_phrase
    },
    production: {
        port: process.env.PW_PORT,
        mongoDB: process.env.PW_MONGO_DB_URL,
        rabbitMq: process.env.PW_RABBIT_MQ,
        queueNames: queueNames,
        telenor_dcb_api_baseurl: telenor_dcb_api_baseurl,
        telenor_dcb_api_token: telenor_dcb_api_token,
        ideation_callback_url: Ideation_call_back_url,
        ideation_callback_url2: Ideation_call_back_url_2,
        ideation_callback_url3: Ideation_call_back_url_3,
        time_between_billing_attempts_hours: time_between_billing_attempts_hours,
        codes: codes,
        telenor_message_api_tps: telenor_message_api_tps,
        telenor_subscription_api_tps: telenor_subscription_api_tps,
        telenor_subscriber_query_api_tps: telenor_subscriber_query_api_tps,
        balance_check_api_tps: balance_check_api_tps,
        telenor_free_mbs_api_tps: telenor_free_mbs_api_tps,
        trial_hours: hours_of_trial_period,
        is_trial_active: is_trial_functionality_activated,
        maximum_daily_payment_limit_pkr: maximum_daily_payment_limit_pkr,
        unsub_time_limit: max_time_in_hours_since_last_viewed_by_user_after_which_to_unsubscribe,
        max_graylist_time_in_hrs: max_graylist_time_in_hrs,
        hours_on_which_to_run_renewal_cycle: hours_on_which_to_run_renewal_cycle,
        logger_url: "http://127.0.0.1:8000/",
        secret: "MVPUBRY2IV",
        emailhost:"mail.dmdmax.com.pk",
        emailUsername: "reports@goonj.pk",
        emailPassword: "YiVmeCPtzJn39Mu",
        emailPort: 465,
        emailSecure: true,
        default_package_id: default_package_id,
        he_service_pass_phrase: he_service_pass_phrase
    }
};

console.log("---", env);

if (env === 'development') config = config.development;
if (env === 'staging') config = config.staging;
if (env === 'production') config = config.production;

module.exports = config;
