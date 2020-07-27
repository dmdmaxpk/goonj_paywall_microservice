const axios = require('axios');
const config = require('./../config');
const helper = require('./../helper/helper');
const crypto = require("crypto");
const shortId = require('shortid');
const NodeRSA = require('node-rsa');

class EasypaisaPaymentService {
    constructor(){
        this.emailAddress = 'muhammad.azam@dmdmax.com';
        this.username = 'Goonj';
        this.password = '8c2f6b83579b69bc04903d1c3310c2db';
        this.storeId = '42221';
        this.orderId = this.getOrderId();
        this.signature = null;
        this.publicKey = null;
        this.privateKey = null;
        this.generateotpUrl = 'https://apis.telenor.com.pk/epp/v2/generateotp';
        this.initiatelinktransactionUrl = 'https://apis.telenor.com.pk/epp/v2/initiatelinktransaction';
        this.initiatepinlesstransactionUrl = 'https://apis.telenor.com.pk/epp/v2/initiatepinlesstransaction';
        this.base64_cred = Buffer.from(this.username+":"+this.password).toString('base64');
    }

    /*
   * Boot the script to get new User OTP
   * Params: mobileAccountNo (user mobile number)
   * Return Type: Object
   * */
    async bootOptScript(mobileAccountNo){
        await this.getKey();
        return await this.generateOPT(mobileAccountNo);
    }

    /*
   * Used to initiate transaction using User OTP
   * Params: mobileAccountNo, transactionAmount, OTP
   * Return Type: Object
   * */
    async initiateLinkTransaction(mobileAccountNo, transactionAmount, otp){
        console.log('initiateLinkTransaction: ', mobileAccountNo, transactionAmount, otp);

        try {
            let self = this;
            await self.getKey();
            self.getOrderId();
            let data = {
                'request': {
                    'orderId': self.orderId,
                    'storeId': self.storeId,
                    'transactionAmount': '' + transactionAmount,
                    'transactionType': 'MA',
                    'mobileAccountNo': mobileAccountNo,
                    'emailAddress': self.emailAddress,
                    'otp': otp
                }
            };
            console.log('initiateLinkTransaction: data: ', data);
            console.log('initiateLinkTransaction: URL: ', self.initiatelinktransactionUrl);

            self.generateSignature(data);
            data.signature = self.signature;    
            let resp = await axios({
                method: 'post',
                //url: config.telenor_dcb_api_baseurl + 'eppinless/v1/initiate-link-transaction',
                url: self.initiatelinktransactionUrl,
                data: data,
                headers: {'Credentials': self.base64_cred, 'Authorization': 'Bearer '+config.telenor_dcb_api_token, 'Content-Type': 'application/json' }
            });
            
            let returnObj = {};
            returnObj.transaction_id = self.orderId;
            
            if (resp.status === 200 && resp.data.response.responseDesc === "SUCCESS"){
                console.log('initiateLinkTransaction: success : response 2: ');
                returnObj.message = "success";
                returnObj.response = resp.data;

                // console.log('initiateLinkTransaction: success : tokenNumber: ', resp.data.response.tokenNumber);
                // Now close the link between Merchant and Easypaisa after successful transaction
                // self.deactivateLinkTransaction(mobileAccountNo, resp.data.response.tokenNumber);
            }
            else{
                console.log('initiateLinkTransaction: failed : response 2: ');
                returnObj.message = "failed";
                returnObj.response = resp.data;
            }
            return returnObj;
        } catch(err){
            console.log('initiateLinkTransaction error 2: ', err);
            throw err;
        }
    }

    /*
    * Used to perform pinless Mobile Account transaction using easypaisa MA token - mainly used in renewal subscription
    * Params: mobileAccountNo, packageObj(user package info), transaction_id(user transaction ID), subscription(Subscription data)
    * Return Type: Object
    * */
    async initiatePinlessTransaction(mobileAccountNo, price_point, transaction_id, subscription){
        try {
            let self = this, returnObj = {};
            await self.getKey();
            self.getOrderId();

            let data = {
                'request': {
                    'orderId': transaction_id ? transaction_id : self.orderId,
                    'storeId': self.storeId,
                    'transactionAmount': '' + price_point,
                    'transactionType': 'MA',
                    'mobileAccountNo': mobileAccountNo,
                    'emailAddress': self.emailAddress,
                    'tokenNumber': subscription.ep_token,
                }
            };

            self.generateSignature(data);
            data.signature = self.signature;
            let resp = await axios({
                method: 'post',
                //url: config.telenor_dcb_api_baseurl + 'eppinless/v1/initiate-link-transaction',
                url: self.initiatepinlesstransactionUrl,
                data: data,
                headers: {'Credentials': self.base64_cred, 'Authorization': 'Bearer '+config.telenor_dcb_api_token, 'Content-Type': 'application/json' }
            });

            if (resp.status === 200 && resp.data.response.responseDesc === "SUCCESS"){
                console.log('initiatePinlessTransaction: success : response 2: ');
                returnObj.message = "success";
                returnObj.response = resp.data;

                // Now close the link between Merchant and Easypaisa after successful transaction
                // self.deactivateLinkTransaction(mobileAccountNo, subscription.ep_token);
            }
            else{
                console.log('initiatePinlessTransaction: failed : response 2: ');
                returnObj.message = "failed";
                returnObj.response = resp.data;
            }
            return returnObj;

        } catch(err){
            console.log('initiatePinlessTransaction error 2: ', err);
            throw err;
        }
    }

    /*
    * Used to break the link/pair between merchant and customer
    * Params: mobileAccountNo, tokenNumber(easypaisa token no)
    * Return Type: Object
    * */
    async deactivateLinkTransaction(mobileAccountNo, tokenNumber){
        try {
            let self = this, returnObj = {};
            await self.getKey();
            let data = {
                'request': {
                    'storeId': self.storeId,
                    'mobileAccountNo': mobileAccountNo,
                    'tokenNumber': tokenNumber
                }
            };

            self.generateSignature(data);
            data.signature = self.signature;
            let resp = await axios({
                method: 'post',
                //url: config.telenor_dcb_api_baseurl + 'eppinless/v1/deactivate-link',
                url: 'https://apis.telenor.com.pk/epp/v2/deactivatelink',
                data: data,
                    headers: {'Credentials': self.base64_cred, 'Authorization': 'Bearer '+config.telenor_dcb_api_token, 'Content-Type': 'application/json'}
                });

            if (resp.status === 200 && resp.data.response.responseDesc === "SUCCESS"){
                console.log('deactivateLinkTransaction: success : response 2: ');
                returnObj.message = "success";
                returnObj.response = resp.data;
            }
            else{
                console.log('deactivateLinkTransaction: failed : response 2: ');
                returnObj.message = "failed";
                returnObj.response = resp.data;
            }
            return returnObj;
        } catch(err){
            console.log('deactivateLinkTransaction: Err: ', err);
            throw err;
        }
    }

    /*
    * Telenor OTP - Merchant app call to get user OTP
    * Private key is used to generate signature
    * Params: mobileAccountNo
    * Return Type: Object
    * */
    async generateOPT(mobileAccountNo){
        let self = this;
        let data = {
            'request': {
                'storeId': self.storeId,
                'mobileAccountNo': mobileAccountNo
            }
        };
        try {
            self.generateSignature(data);
            data.signature = self.signature;
            let resp = await axios({
                    method: 'post',
                    //url: config.telenor_dcb_api_baseurl + 'eppinless/v1/generate-otp',
                    url: self.generateotpUrl,
                    data: data,
                    headers: {'Credentials': self.base64_cred, 'Authorization': 'Bearer '+config.telenor_dcb_api_token, 'Content-Type': 'application/json'}
                });
            console.log('generateOPT: EP: ', resp.data);
            if (resp.status === 200)
                return {'code': config.codes.code_success, 'message': 'OTP Sent'};
            else
                return {'code': config.codes.code_error, 'message': 'Failed sent OTP'};
        }catch (e) {
            return {'code': config.codes.code_error, 'message': e.message};
        }
    }

    /*
    * Generate a unique ID for orderId parameter
    * Params: null
    * Return Type: Object
    * */
    getOrderId() {
        //this.orderId = "GoonjEasypaisa_"+shortId.generate()+"_"+helper.getCurrentDate();
        this.orderId = "GEP_"+shortId.generate();
        return this.orderId;
    }

    /*
    * RSA Encryption
    * Used to generate random Public and Private keys that will be used to generate signature for each Easypaisa & Telenor endpoint call.
    * Params: null
    * Return Type: Object
    * */
    generateKeys() {
        const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
            modulusLength: 2048,
        });

        this.publicKey = publicKey;
        this.privateKey = privateKey;
        return {'code': config.codes.code_success, 'message': 'Public and private keys are generated successfully', 'method': 'generateKeys'};
    }

    /*
    * Used to update private key object.
    * Params: null
    * Return Type: null
    * */
    getKey(){
        this.privateKey = helper.easypaisaPrivateKey();
    }

    /*
    * Hash Algorithm using sha256
    * Private key is used to generate signature. Its length should be 2048 bits.
    * Params: null
    * Return Type: Object
    * */
    generateSignature(object){
        let trimmedData = JSON.stringify(object.request).replace(/(\\)?"\s*|\s+"/g, ($0, $1) => $1 ? $0 : '"');
        let key = new NodeRSA(null, {signingScheme: 'sha256'});
        key.importKey(this.privateKey, 'pkcs8');
        this.signature = key.sign(trimmedData, 'base64');
    }

    /*
    * RSA Encryption - verify the signature
    * Public key is used to verify the signature. Its length should be 2048 bits.
    * Params: null
    * Return Type: Object
    * */
    verfiySignature(){
        try {

            return {'code': config.codes.code_success, 'message': 'Signature is verifies successfully', 'method': 'verfiySignature'};
        } catch(err){
            return {'code': config.codes.code_error, 'message': err.message, 'method': 'verfiySignature'};
        }
    }
}

module.exports = EasypaisaPaymentService;
