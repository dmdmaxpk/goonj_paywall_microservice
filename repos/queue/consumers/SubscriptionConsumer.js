
const config = require('../../../config');
const moment = require('moment');
var nodemailer = require('nodemailer');
const axios =require("axios");

class SubscriptionConsumer {

    constructor({emailService,subscriptionRepository,billingHistoryRepository,tpsCountRepository,billingRepository,
        packageRepository,messageRepository,userRepository}) {
        this.subscriptionRepo = subscriptionRepository;
        this.billingHistoryRepo = billingHistoryRepository;
        this.tpsCountRepo = tpsCountRepository;
        this.billingRepo = billingRepository;
        this.packageRepo = packageRepository;
        this.messageRepo = messageRepository;
        this.userRepo = userRepository;
        this.emailService = emailService;
    }

    async consume(message) {
        let subscriptionObj = JSON.parse(message.content);

        let source = subscriptionObj.source;
        let transaction_id = subscriptionObj.transactionId;
        let subscription = subscriptionObj.subscription;
        let micro_charge = subscriptionObj.micro_charge;
        let discount = subscriptionObj.discount;
        
        try {
            
            // Check if the subscription is active or blocked for some reason.
            if (subscription.active === true) {
                
                // Check if any user being excessive charge
                if (subscription.amount_billed_today < config.maximum_daily_payment_limit_pkr ) {
                    
                    // Check current tps count
                    let countThisSec = await this.tpsCountRepo.getTPSCount(config.queueNames.subscriptionDispatcher);
                    if (countThisSec < config.telenor_subscription_api_tps) {
    
                        await this.tpsCountRepo.incrementTPSCount(config.queueNames.subscriptionDispatcher);
                        if(micro_charge){
                            this.tryMicroChargeAttempt(message, subscription, transaction_id, subscriptionObj.micro_price);
                        }else if(discount){
                            this.tryDiscountedChargeAttempt(message, subscription, transaction_id, subscriptionObj.discounted_price);
                        }else{
                            this.tryFullChargeAttempt(message, subscription, transaction_id, subscriptionObj.is_manual_recharge);
                        }
                        
                    }  else{
                        console.log("TPS quota full for subscription, waiting for second to elapse - ", new Date());
                        setTimeout(() => {
                            console.log("Calling consume subscription queue after 200 seconds");
                            this.consume(message);
                        }, 200);
                    }  
                }else{
                    console.log("Excessive charging");
                    let packageObj = await this.packageRepo.getPackage({_id: subscription.subscribed_package_id});
                    let user = await this.userRepo.getUserBySubscriptionId(subscription._id);

                    await this.subscriptionRepo.markSubscriptionInactive(subscription._id);
                    await this.unQueue(subscription._id);
                    await this.shootExcessiveBillingEmail(subscription._id);
    
                    // Add history
                    let history = {};
                    history.user_id = user._id;
                    history.package_id = packageObj._id;
                    history.paywall_id = packageObj.paywall_id;
                    history.subscription_id = subscription._id;
                    history.subscriber_id = subscription.subscriber_id;
                    history.transaction_id = subscriptionObj.transaction_id;
                    
                    if(source){
                        history.source = source;
                    }

                    history.operator_response = {"message": `Subscription ${subscription._id} has exceeded their billing limit. Email sent.`};
                    history.billing_status = "billing_exceeded";
                    history.operator = 'telenor';
                    this.addHistory(history);
                    console.log("[SubscriptionConsumer][excessiveCharging][RabbitMQ-Acknowledge]");
                    rabbitMq.acknowledge(message);
                }
            } else {
                console.log("[SubscriptionConsumer]InactiveSubscription][RabbitMQ-Acknowledge]",subscription._id);
                rabbitMq.acknowledge(message);
            }
        }
        catch(err){
            console.log("[Subscription][consume][error]");
            console.log(err);
        }
       
    }
    
    // CHARGING ATTEMPTS
    async tryFullChargeAttempt(queueMessage, subscription, transaction_id, is_manual_recharge) {
        
        let packageObj = await this.packageRepo.getPackage({_id: subscription.subscribed_package_id});
        let user = await this.userRepo.getUserBySubscriptionId(subscription._id);
       
        
        try{
            let response = await this.billingRepo.fullChargeAttempt(user.msisdn, packageObj, transaction_id, subscription);
            let api_response = response.api_response;
            let message = api_response.data.Message;
    
            if(message === 'Success'){
                console.log("Billing success for subscription id:", subscription._id);
                
                // Save tp billing response
                this.createBillingHistory(subscription, api_response.data, message, transaction_id, false, false, packageObj.price_point_pkr, packageObj);
                
                // Success billing
                let nextBilling = new Date();
                nextBilling.setHours(nextBilling.getHours() + packageObj.package_duration);
    
                // Update subscription
                let subscriptionObj = {};
                subscriptionObj.subscription_status = 'billed';
                subscriptionObj.auto_renewal = true;
                subscriptionObj.is_billable_in_this_cycle = false;
                subscriptionObj.is_allowed_to_stream = true;
                subscriptionObj.last_billing_timestamp = new Date();
                subscriptionObj.next_billing_timestamp = nextBilling;
                subscriptionObj.amount_billed_today = subscription.amount_billed_today + packageObj.price_point_pkr;
                subscriptionObj.total_successive_bill_counts = ((subscription.total_successive_bill_counts ? subscription.total_successive_bill_counts : 0) + 1);
                subscriptionObj.consecutive_successive_bill_counts = ((subscription.consecutive_successive_bill_counts ? subscription.consecutive_successive_bill_counts : 0) + 1);
                subscriptionObj.queued = false;
                
                let updatedSubscription = await this.subscriptionRepo.updateSubscription(subscription._id, subscriptionObj);
                
                // Check for the affiliation callback
                if(updatedSubscription.affiliate_unique_transaction_id && updatedSubscription.affiliate_mid && updatedSubscription.is_affiliation_callback_executed === false){
                    if((updatedSubscription.source === "HE" || updatedSubscription.source === "affiliate_web") && updatedSubscription.affiliate_mid != "1") {
                        // Send affiliation callback
                        this.sendAffiliationCallback(
                            updatedSubscription.affiliate_unique_transaction_id, 
                            updatedSubscription.affiliate_mid,
                            user._id,
                            subscription._id,
                            subscription.subscriber_id,
                            packageObj._id,
                            packageObj.paywall_id
                            );
                    }
                }
    
                // Send acknowledgement message
                this.sendMessage(updatedSubscription, user.msisdn, packageObj.package_name, packageObj.price_point_pkr, is_manual_recharge,packageObj._id,user._id);
                rabbitMq.acknowledge(queueMessage);
            }else{
                // Unsuccess billing. Save tp billing response
                console.log("Billing failed for subscription id:", subscription._id);
                await this.assignGracePeriod(subscription, user, packageObj, is_manual_recharge,api_response.data,transaction_id);
                rabbitMq.acknowledge(queueMessage);
            }
        }catch(error){
            console.log("Billing failed for subscription id:", subscription._id);
            if (error.response && error.response.data){
                console.log('Error ',error.response.data);
            }else {
                console.log('Error billing failed: ', error);
            }
    
            // TODO: Recursion not being handled.
            if ( error.response.data.errorCode === "500.007.08" || (error.response.data.errorCode === "500.007.05" &&
                    error.response.data.errorMessage === "Services of the same type cannot be processed at the same time.") ) {
                // Consider, tps exceeded, noAcknowledge will requeue this record.
                console.log('Sending back to queue:errorCode:',error.response.data.errorCode,subscription._id);
                rabbitMq.noAcknowledge(queueMessage);
                return;
            }
    
            await this.assignGracePeriod(subscription, user, packageObj, is_manual_recharge,error.response.data,transaction_id);
            rabbitMq.acknowledge(queueMessage);
        }
    }
    
    async tryDiscountedChargeAttempt (queueMessage, subscription, transaction_id, discounted_price) {
        console.log("tryDiscountedChargeAttempt");
        let packageObj = await this.packageRepo.getPackage({_id: subscription.subscribed_package_id});
        let response = await this.billingRepo.fullChargeAttempt(user.msisdn, packageObj, transaction_id, subscription);
        try{
            if(packageObj.price_point_pkr > discounted_price){
                packageObj.price_point_pkr = discounted_price;
            }
            let user = await this.userRepo.getUserBySubscriptionId(subscription._id);
        
            let api_response = response.api_response;
            let message = api_response.data.message;
    
            if(message === 'Success'){
                
                // Save tp billing response
                this.createBillingHistory(subscription, api_response.data, message, transaction_id, false, true, discounted_price, packageObj);
                
                // Success billing
                let nextBilling = new Date();
                nextBilling.setHours(nextBilling.getHours() + packageObj.package_duration);
    
                // Update subscription
                let subscriptionObj = {};
                subscriptionObj.subscription_status = 'billed';
                subscriptionObj.auto_renewal = true;
                subscriptionObj.is_billable_in_this_cycle = false;
                subscriptionObj.is_allowed_to_stream = true;
                subscriptionObj.last_billing_timestamp = new Date();
                subscriptionObj.next_billing_timestamp = nextBilling;
                subscriptionObj.amount_billed_today = subscription.amount_billed_today + discounted_price;
                subscriptionObj.total_successive_bill_counts = ((subscription.total_successive_bill_counts ? subscription.total_successive_bill_counts : 0) + 1);
                subscriptionObj.consecutive_successive_bill_counts = ((subscription.consecutive_successive_bill_counts ? subscription.consecutive_successive_bill_counts : 0) + 1);
                subscriptionObj.queued = false;

                // Fields for micro charging
                subscriptionObj.try_micro_charge_in_next_cycle = false;
                subscriptionObj.micro_price_point = 0;
                
                let updatedSubscription = await this.subscriptionRepo.updateSubscription(subscription._id, subscriptionObj);
                
                // Check for the affiliation callback
                if(updatedSubscription.affiliate_unique_transaction_id && updatedSubscription.affiliate_mid && updatedSubscription.is_affiliation_callback_executed === false){
                    if((updatedSubscription.source === "HE" || updatedSubscription.source === "affiliate_web") && updatedSubscription.affiliate_mid != "1") {
                        // Send affiliation callback
                        this.sendAffiliationCallback(
                            updatedSubscription.affiliate_unique_transaction_id, 
                            updatedSubscription.affiliate_mid,
                            user._id,
                            subscription._id,
                            subscription.subscriber_id,
                            packageObj._id,
                            packageObj.paywall_id
                            );
                    }
                }
    
                // Send acknowledgement message
                this.sendMessage(updatedSubscription, user.msisdn, packageObj.package_name, discounted_price, false,packageObj._id,user._id);
                rabbitMq.acknowledge(queueMessage);
            }else{
                // Unsuccess billing. Save tp billing response
                await this.assignGracePeriod(subscription, user, packageObj, false,api_response.data,transaction_id);
                // this.createBillingHistory(subscription, api_response.data, "graced", transaction_id, false, true, discounted_price, packageObj);
                rabbitMq.acknowledge(queueMessage);
            }
        }catch(error){
            if (error.response && error.response.data){
                console.log('Error ',error.response.data);
            }else {
                console.log('Error billing failed: ', error);
            }
    
            // Consider, tps exceeded, noAcknowledge will requeue this record.
            if ( error.response.data.errorCode === "500.007.08" || (error.response.data.errorCode === "500.007.05" &&
            error.response.data.errorMessage ==="Services of the same type cannot be processed at the same time.") ){
                console.log('Sending back to queue',error.response.data.errorCode,subscription._id);
                rabbitMq.noAcknowledge(queueMessage);
                return;
            }else {
                // Consider, payment failed for any reason. e.g no credit, number suspended etc
                await this.unQueue(subscription._id);
            }
    
            await this.assignGracePeriod(subscription, user, packageObj, false,error.response.data,transaction_id);
            rabbitMq.acknowledge(queueMessage);
        }
    }
    
    async tryMicroChargeAttempt(queueMessage, subscription, transaction_id, micro_price) {
        let packageObj = await this.packageRepo.getPackage({_id: subscription.subscribed_package_id});
        let user = await this.userRepo.getUserBySubscriptionId(subscription._id);
        try{
            
            if(micro_price <= packageObj.price_point_pkr){
                let response = await this.billingRepo.microChargeAttempt(user.msisdn, packageObj, transaction_id, micro_price, subscription);
                let api_response = response.api_response;
                let message = api_response.data.Message;

                if(message === 'Success'){
                    console.log("Micro Chargning success for ",subscription._id," for price ",micro_price);
                    // Save tp billing response
                    this.createBillingHistory(subscription, api_response.data, message, transaction_id, true, false, micro_price, packageObj);
                    
                    // Success billing
                    let nextBilling = new Date();
                    nextBilling.setHours(nextBilling.getHours() + packageObj.package_duration);
        
                    // Update subscription
                    let subscriptionObj = {};
                    subscriptionObj.subscription_status = 'billed';
                    subscriptionObj.auto_renewal = true;
                    subscriptionObj.is_billable_in_this_cycle = false;
                    subscriptionObj.is_allowed_to_stream = true;
                    subscriptionObj.last_billing_timestamp = new Date();
                    subscriptionObj.next_billing_timestamp = nextBilling;
                    subscriptionObj.amount_billed_today = subscription.amount_billed_today + micro_price;
                    subscriptionObj.total_successive_bill_counts = ((subscription.total_successive_bill_counts ? subscription.total_successive_bill_counts : 0) + 1);
                    subscriptionObj.consecutive_successive_bill_counts = ((subscription.consecutive_successive_bill_counts ? subscription.consecutive_successive_bill_counts : 0) + 1);
                    subscriptionObj.queued = false;
                    
                    // Fields for micro charging
                    subscriptionObj.try_micro_charge_in_next_cycle = false;
                    subscriptionObj.micro_price_point = 0;

                    let updatedSubscription = await this.subscriptionRepo.updateSubscription(subscription._id, subscriptionObj);
                    
                    // Check for the affiliation callback
                    if(updatedSubscription.affiliate_unique_transaction_id && updatedSubscription.affiliate_mid && updatedSubscription.is_affiliation_callback_executed === false){
                        if((updatedSubscription.source === "HE" || updatedSubscription.source === "affiliate_web") && updatedSubscription.affiliate_mid != "1") {
                            // Send affiliation callback
                            this.sendAffiliationCallback(
                                updatedSubscription.affiliate_unique_transaction_id, 
                                updatedSubscription.affiliate_mid,
                                user._id,
                                subscription._id,
                                subscription.subscriber_id,
                                packageObj._id,
                                packageObj.paywall_id
                                );
                        }
                    }
        
                    // Send acknowledgement message
                    this.sendMicroChargeMessage(user.msisdn, packageObj.price_point_pkr, micro_price, packageObj.package_name);
                    rabbitMq.acknowledge(queueMessage);
                }else{
                    // Unsuccess billing. Save tp billing response
                    await this.assignGracePeriod(subscription, user, packageObj, false,api_response.data,transaction_id);
                    rabbitMq.acknowledge(queueMessage);
                }
            }else{
                //TODO shoot an email
                let emailSubject ="Excessive MicroCharing Email";
                let emailToSend = "paywall@dmdmax.com.pk";
                let emailText = `Subscription id ${subscription._id} is trying to micro charge on a price greater than package price. Package price is ${packageObj.price_point_pkr} and system tried to charge ${micro_price}`;
                this.createBillingHistory(subscription, undefined, "micro-price-point-is-greater-than-package-price-so-didnt-try-charging-attempt", transaction_id, true, false, 0, packageObj);
                await this.emailService.sendEmail(emailSubject,emailText,emailToSend);
                await this.subscriptionRepo.updateSubscription(subscription._id, {active:false, queued:false, is_billable_in_this_cycle: false});
                rabbitMq.acknowledge(queueMessage);
            }
        }catch(error){
            if (error.response && error.response.data){
                console.log('Error ',error.response.data);
            }else {
                console.log('Error billing failed: ', error);
            }
    
            // Consider, tps exceeded, noAcknowledge will requeue this record.
            if ( error.response.data.errorCode === "500.007.08" || (error.response.data.errorCode === "500.007.05" &&
            error.response.data.errorMessage ==="Services of the same type cannot be processed at the same time.") ){
                console.log('Sending back to queue',error.response.data.errorCode,subscription._id);
                rabbitMq.noAcknowledge(queueMessage);
                return;
            }else {
                // Consider, payment failed for any reason. e.g no credit, number suspended etc
                await this.unQueue(subscription._id);
            }
    
            // this.createBillingHistory(subscription, error.response.data, "graced", transaction_id, true, false, micro_price, packageObj);
            await this.assignGracePeriod(subscription, user, packageObj, false,error.response.data,transaction_id);
            rabbitMq.acknowledge(queueMessage);
        }
    }
    
    // ASSIGN GRACE PERIOD
    async assignGracePeriod(subscription, user, packageObj, is_manual_recharge,error,transaction_id) {
    
        let subscriptionObj = {};
        subscriptionObj.queued = false;
        let historyStatus;
    
        if((subscription.subscription_status === 'billed' || subscription.subscription_status === 'trial') && subscription.auto_renewal === true){
            // The subscriber is eligible for grace hours, depends on the current subscribed package
            
            let nextBillingDate = new Date();
            nextBillingDate.setHours(nextBillingDate.getHours() + config.time_between_billing_attempts_hours);
            
            subscriptionObj.subscription_status = 'graced';
            subscriptionObj.next_billing_timestamp = nextBillingDate;
            subscriptionObj.date_on_which_user_entered_grace_period = new Date();
            subscriptionObj.is_billable_in_this_cycle = false;
            
            historyStatus="graced";
            //Send acknowldement to user
            let link = 'https://www.goonj.pk/goonjplus/open';
            let message = "You've been awarded a grace period of "+packageObj.streamable_grace_hours+" hours. Click below link to open Goonj.\n"+link
            this.messageRepo.sendSmsToUser(message, user.msisdn);

        }else if(subscription.subscription_status === 'graced' && subscription.auto_renewal === true){
            // Already in grace, check if given time has been passed in grace, stop streaming
    
            let nowDate = moment();
            let timeInGrace = moment.duration(nowDate.diff(subscription.date_on_which_user_entered_grace_period));
            let hoursSpentInGracePeriod = timeInGrace.asHours();
            console.log("hoursSpentInGracePeriod",hoursSpentInGracePeriod);
    
            if (is_manual_recharge){
                let message = "You have insufficient amount for Goonj TV subscription. Please recharge your account for watching Live channels on Goonj TV. Stay Safe";
                this.messageRepo.sendSmsToUser(message, user.msisdn);
            }
    
            if (hoursSpentInGracePeriod > packageObj.grace_hours){
                subscriptionObj.subscription_status = 'expired';
                subscriptionObj.consecutive_successive_bill_counts = 0;
                subscriptionObj.auto_renewal = false;
                subscriptionObj.is_allowed_to_stream = false;
                subscriptionObj.is_billable_in_this_cycle = false;
                historyStatus = "expired";
                    
                //Send acknowledgement to user
                let link = 'https://www.goonj.pk/goonjplus/subscribe';
                let message = 'You package to Goonj TV has expired, click below link to subscribe again.\n'+link;
                this.messageRepo.sendSmsToUser(message, user.msisdn);
                
                subscriptionObj.try_micro_charge_in_next_cycle = false;
                subscriptionObj.micro_price_point = 0;

            }else if(packageObj.is_micro_charge_allowed === true && hoursSpentInGracePeriod > 8 && hoursSpentInGracePeriod <= 24){
                console.log("Micro Charging Activated for: ",subscription._id);
                subscriptionObj.subscription_status = 'graced';
                historyStatus = "graced";
                subscriptionObj = this.activateMicroCharging(subscription, packageObj, subscriptionObj);
                console.log("Micro Charging Activated Subscription Object Returned:",subscriptionObj);
            }else{
                let nextBillingDate = new Date();
                nextBillingDate.setHours(nextBillingDate.getHours() + config.time_between_billing_attempts_hours);
                
                subscriptionObj.subscription_status = 'graced';
                subscriptionObj.next_billing_timestamp = nextBillingDate;
                historyStatus = "graced";
    
                //TODO set is_allowed_to_stream to false if 24 hours have passed in grace period
                let last_billing_timestamp = moment(subscription.last_billing_timestamp);
                var hours;
    
                if (subscription.last_billing_timestamp) {
                    let now = moment()
                    let difference = moment.duration(now.diff(last_billing_timestamp));
                    hours = difference.asHours();
                } else {
                    hours = hoursSpentInGracePeriod;
                }
                console.log("Hours since last payment", hours);
                if (hours > packageObj.streamable_grace_hours && subscription.is_allowed_to_stream === true) {
                    // Stop the stream
                    subscriptionObj.is_allowed_to_stream = false;
                    historyStatus = "graced_and_stream_stopped";

                    subscriptionObj.try_micro_charge_in_next_cycle = false;
                    subscriptionObj.micro_price_point = 0;
                }
            }
        }else{
            historyStatus = "payment request tried, failed due to insufficient balance.";
            subscriptionObj.auto_renewal = false;
            subscriptionObj.is_allowed_to_stream = false;
            subscriptionObj.consecutive_successive_bill_counts = 0;
            
            //Send acknowledgement to user
            let message = 'You have insufficient balance for Goonj TV, please try again after recharge. Thanks';
            this.messageRepo.sendSmsToUser(message, user.msisdn);
        }

        if(!subscription.try_micro_charge_in_next_cycle) {
            subscriptionObj.is_billable_in_this_cycle = false;
        }

        await this.subscriptionRepo.updateSubscription(subscription._id, subscriptionObj);
        if(historyStatus){
            let history = {};
            history.billing_status = historyStatus;
            history.user_id = user._id;
            history.subscription_id = subscription._id;
            history.subscriber_id = subscription.subscriber_id;
            history.paywall_id = packageObj.paywall_id;
            history.package_id = subscription.subscribed_package_id;
            history.micro_charge = subscription.try_micro_charge_in_next_cycle;
            history.price = (subscription.try_micro_charge_in_next_cycle)?subscription.micro_price_point:0;
            history.transaction_id = transaction_id;
            history.operator = 'telenor';
            history.operator_response = error;
            await this.addHistory(history);
        }
    }

    // Activate micro charging
    activateMicroCharging(subscription, packageObj, subscriptionObj){
        console.log("activateMicroCharging")
        let micro_price_points = packageObj.micro_price_points;
        let current_micro_price_point = subscription.micro_price_point;
        let tempSubObj  = JSON.parse(JSON.stringify(subscriptionObj));
        if(current_micro_price_point > 0){
            // It means micro charging attempt had already been tried and was unsuccessful, lets hit on lower price
            let index = micro_price_points.indexOf(current_micro_price_point);
            if(index > 0){
                tempSubObj.try_micro_charge_in_next_cycle = true;
                tempSubObj.micro_price_point = micro_price_points[--index];
            }else if(index === -1){
                tempSubObj.try_micro_charge_in_next_cycle = true;
                tempSubObj.micro_price_point = micro_price_points[micro_price_points.length - 1];
            }else{
                tempSubObj.try_micro_charge_in_next_cycle = false;
                tempSubObj.micro_price_point = 0;
                tempSubObj.is_billable_in_this_cycle = false;
            }
        }else{
            // It means micro tying first micro charge attempt
            tempSubObj.try_micro_charge_in_next_cycle = true;
            tempSubObj.micro_price_point = micro_price_points[micro_price_points.length - 1];
        }
        return tempSubObj;
    }
    
    // ADD BILLING HISTORY
    async createBillingHistory(
        subscription, response, billingStatus, 
        transaction_id, micro_charge, discount, price, packageObj) {
        
        let user = await this.userRepo.getUserBySubscriptionId(subscription._id);
        
        let history = {};
        history.user_id = user._id;
        history.subscription_id = subscription._id;
        history.subscriber_id = subscription.subscriber_id;
        history.paywall_id = packageObj.paywall_id;
        history.package_id = subscription.subscribed_package_id;
        history.transaction_id = transaction_id;
        history.operator_response = response;
        history.billing_status = billingStatus;
        
        history.operator = 'telenor';
    
        if(micro_charge === true){
            history.price = price;
            history.micro_charge = true;
            history.discount = false;
        }else if(discount === true){
            history.price = price;
            history.micro_charge = false;
            history.discount = true;
        }else{
            history.micro_charge = false;
            history.discount = false;
            history.price = price;
        }
        
        this.addHistory(history);
    }
    
    async addHistory(history) {
        await this.billingHistoryRepo.createBillingHistory(history);
    }
    
    // UN-QUEUE SUBSCRIPTION
    async unQueue (subscription_id) {
        await this.subscriptionRepo.updateSubscription(subscription_id, {queued: false});
    }
    
    // SHOOT EMAIL
    async shootExcessiveBillingEmail(subscription_id)  {
        try {
            let emailSubject = `User Billing Exceeded`;
            let emailText = `Subscription id ${subscription_id} has exceeded its billing limit. Please check on priority.`;
            let emailToSend = `paywall@dmdmax.com.pk`;
            let response = await this.emailService.sendEmail(emailSubject,emailText,emailToSend);
            console.log("response",response);
        } catch(err){
            console.error(err);
        }   
    }
    
    async sendAffiliationCallback(tid, mid, user_id, subscription_id, subscriber_id, package_id, paywall_id) {
        let combinedId = tid + "*" +mid;
    
        let history = {};
        history.user_id = user_id;
        history.paywall_id = paywall_id;
        history.subscription_id = subscription_id;
        history.subscriber_id = subscriber_id;
        history.package_id = package_id;
        history.transaction_id = combinedId;
        history.operator = 'telenor';
    
        console.log(`Sending Affiliate Marketing Callback Having TID - ${tid} - MID ${mid}`);
        this.sendCallBackToIdeation(mid, tid).then(async function(fulfilled) {
            let updated = await this.subscriptionRepo.updateSubscription(subscription_id, {is_affiliation_callback_executed: true});
            if(updated){
                console.log(`Successfully Sent Affiliate Marketing Callback Having TID - ${tid} - MID ${mid} - Ideation Response - ${fulfilled}`);
                history.operator_response = fulfilled;
                history.billing_status = "Affiliate callback sent";
                await this.addHistory(history);
            }
        })
        .catch(async  (error) => {
            console.log(`Affiliate - Marketing - Callback - Error - Having TID - ${tid} - MID ${mid}`, error);
            history.operator_response = error.response.data;
            history.billing_status = "Affiliate callback error";
            await this.addHistory(history);
        });
    }
    
    async sendCallBackToIdeation(mid, tid)  {
        var url; 
        if (mid === "1569") {
            url = config.ideation_callback_url + `p?mid=${mid}&tid=${tid}`;
        } else if (mid === "goonj"){
            url = config.ideation_callback_url2 + `?txid=${tid}`;
        } else if (mid === "1" || mid === "gdn" ){
            return new Promise((resolve,reject) => { reject(null)})
        }
        console.log("url",url)
        return new Promise(function(resolve, reject) {
            axios({
                method: 'post',
                url: url,
                headers: {'Content-Type': 'application/x-www-form-urlencoded' }
            }).then(function(response){
                resolve(response.data);
            }).catch(function(err){
                reject(err);
            });
        });
    }
    
    sendMessage(subscription, msisdn, packageName, price, is_manual_recharge,package_id,user_id) {
        if(subscription.consecutive_successive_bill_counts === 1){
            // For the first time or every week of consecutive billing
    
            //Send acknowldement to user
            let unsubLink = `goonj.pk/unsubscribe?user_id=${user_id}&pid=${package_id}`;
            message = `Apka Goonj tv ka phela Rs${price}/d charge kia gya hai. Live tv dekhnay ke liye www.goonj.pk aur service khatam karnay ke liye ${unsubLink}`;
            this.messageRepo.sendSmsToUser(message, msisdn);
        }else if(subscription.consecutive_successive_bill_counts % 3 === 0){
            // Every week
            //Send acknowledgement to user
            if (is_manual_recharge){
                let message = `You have been successfully subscribed for Goonj TV.Rs.${price} has been deducted from your credit. Stay safe and keep watching Goonj TV`;
                this.messageRepo.sendSmsToUser(message, msisdn);
            } else {
                let unsubLink = `goonj.pk/unsubscribe?user_id=${user_id}&pid=${package_id}`;
                let message = `Goonj tv per top channels Rs${price}/day dekhnay ka shukriya. Service istemal ke liye www.goonj.pk aur service khatam karnay ke liye ${unsubLink}`;
                this.messageRepo.sendSmsToUser(message, msisdn);
            }
        }
    }
    
    sendMicroChargeMessage (msisdn, fullPrice, price, packageName)  {
        console.log("Sending %age discount message to "+msisdn);
        let percentage = ((price / fullPrice)*100);
        percentage = (100 - percentage);
    
        //Send acknowldement to user
        let message = "You've got "+percentage+"% discount on "+packageName;
        this.messageRepo.sendSmsToUser(message, msisdn);
    }
}



module.exports = SubscriptionConsumer;