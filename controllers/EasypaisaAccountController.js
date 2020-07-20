const container = require("../configurations/container");
const easypaisaPaymentService = container.resolve("EasypaisaPaymentService");

exports.bootScript = async (req,res) =>  {
    let requestData = req.body;
    if (requestData.msisdn) {
        record = await easypaisaPaymentService.bootOptScript(requestData.msisdn);
        res.send("Easypaisa get OPT process is done");
    } else{
        res.send("Easypaisa get OPT process is failed. Reason: msisdn is not exist");
    }
};

exports.bootTransactionScript = async (req,res) =>  {
    let requestData = req.body;
    if (requestData.msisdn && requestData.amount && requestData.opt) {
        record = await easypaisaPaymentService.bootTransactionScript(requestData.msisdn, requestData.amount, requestData.opt);
        res.send("Easypaisa payment process done");
    } else{
        res.send("Easypaisa payment process is failed. Reason: msisdn or transaction amount or opt is missed. Please verify the data.");
    }
};