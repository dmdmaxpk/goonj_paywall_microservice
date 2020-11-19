const container = require("../configurations/container");
const BillingHistoryRepository = require("../repos/BillingHistoryRepo");
const billingHistoryRepo = new BillingHistoryRepository();
const userRepo = container.resolve("userRepository");
const subscriberRepo = container.resolve("subscriberRepository");
const subscriptionRepo = container.resolve("subscriptionRepository");
const packageRepo = container.resolve("packageRepository");


exports.createBillingHistory = async (req,res) =>  {
    console.log("Create Billing History");
    let body = req.body;
    let result = await billingHistoryRepo.createBillingHistory(body);
    res.send(result);
}

exports.getUserById = async (req,res) =>  {
    console.log("Get User By ID");
    let query = req.query;
    let result = await userRepo.getUserById(query.id);
    res.send(result);
}

exports.getSubscriber = async (req,res) =>  {
    console.log("Get Subscriber By ID");
    let query = req.query;
    let result = await subscriberRepo.getSubscriber(query.id);
    res.send(result);
}

exports.getSubscription = async (req,res) =>  {
    console.log("Get Subscription By ID");
    let query = req.query;
    let result = await subscriptionRepo.getSubscription(query.id);
    res.send(result);
}

exports.getRenewableSubscriptions = async (req,res) =>  {
    console.log("Get Renewable Subscriptions");
    let result = await subscriptionRepo.getRenewableSubscriptions();
    console.log(result);
    res.send(result);
}

exports.updateSubscription = async (req,res) =>  {
    console.log("Update Subscriptions");
    let body = req.body;
    let result = await subscriptionRepo.updateSubscription(body.query, body.postData);
    res.send(result);
}

exports.getPackage = async (req,res) =>  {
    console.log("Get Package By ID");
    let query = req.query;
    let result = await packageRepo.getPackage(query);
    res.send(result);
}