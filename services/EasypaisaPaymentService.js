const axios = require('axios');
const config = require('./../config');
const helper = require('./../helper/helper');
const crypto = require("crypto");
const shortId = require('shortid');
const e = require('express');
const NodeRSA = require('node-rsa');

class EasypaisaPaymentService {
    constructor(){
        this.emailAddress = 'muhammad.azam@dmdmax.com';
        this.username = 'DMD';
        this.password = '3dca201bc26a31247bb4c6fbd1858468';
        this.storeId = '10631';
        this.orderId = this.getOrderId();
        this.signature = null;
        this.publicKey = null;
        this.privateKey = null;
        this.base64_cred = Buffer.from(this.username+":"+this.password).toString('base64');
    }

    /*
   * Boot the script to get new User OTP
   * Params: msisdn (user mobile number)
   * Return Type: Object
   * */
    async bootOptScript(msisdn){
        await this.getKey();
        return await this.generateOPT(msisdn);
    }

    /*
   * Used to initiate transaction using User OTP
   * Params: mobileAccountNo, transactionAmount, OTP
   * Return Type: Object
   * */
    async initiateLinkTransaction(mobileAccountNo, transactionAmount, otp){
        try {
            await this.getKey();
            this.getOrderId();
            let self = this;
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

            self.generateSignature(data);
            data.signature = self.signature;    
            let resp = await axios({
                method: 'post',
                //url: config.telenor_dcb_api_baseurl + 'eppinless/v1/initiate-link-transaction',
                url: 'https://apis.telenor.com.pk/epp/v1/initiatelinktransaction',
                data: data,
                headers: {'Credentials': self.base64_cred, 'Authorization': 'Bearer '+config.telenor_dcb_api_token, 'Content-Type': 'application/json' }
            });
            
            if (resp.status === 200){
                console.log('initiateLinkTransaction: response 2: ', resp.data);
                return resp.data.response
            }
            else
                return {'code': config.codes.code_error, 'message': 'Transaction failed'};
        } catch(err){
            console.log('initiateLinkTransaction error 2: ', err);
            throw err;
        }
    }

    /*
    * Used to perform pinless Mobile Account transaction using easypaisa MA token - mainly used in renewal subscription
    * Params: msisdn(mobileAccountNo), packageObj(user package info), transaction_id(user transaction ID), subscription(Subscription data)
    * Return Type: Object
    * */
    initiatePinlessTransaction(msisdn, packageObj, transaction_id, subscription){
        try {
            let self = this;
            let returnObject = {};
            returnObject.packageObj = packageObj;
            returnObject.msisdn = msisdn;
            returnObject.transactionId = transaction_id;
            returnObject.subscription = subscription;

            let data = {
                'request': {
                    'orderId': self.orderId,
                    'storeId': self.storeId,
                    'transactionAmount': packageObj.price_point_pkr,
                    'transactionType': 'MA',
                    'mobileAccountNo': msisdn,
                    'emailAddress': self.emailAddress,
                    'tokenNumber': subscription.ep_token,
                }
            };
            console.log('initiatePinlessTransaction: data: ', data);

            return new Promise(function(resolve, reject) {
                self.generateSignature(data);
                resolve(self.signature);
                console.log('initiateLinkTransaction: self.signature: ', self.signature);
            }).then(function(response){
                console.log('initiatePinlessTransaction: response 1: ', response);
                data.signature = response;
                axios({
                    method: 'post',
                    //url: config.telenor_dcb_api_baseurl + 'eppinless/v1/initiate-pinless-transaction',
                    url: 'https://telenor.com.pk/epp/v1/initiatepinlesstransaction',
                    data: data,
                    headers: {'Credentials': self.base64_cred, 'Authorization': 'Basic '+config.telenor_dcb_api_token, 'Content-Type': 'application/x-www-form-urlencoded' }
                }).then(function(response){
                    returnObject.api_response = response.data.response;
                    console.log('initiatePinlessTransaction: response 2: ', returnObject);
                    return returnObject;
                }).catch(function(err){
                    throw err;
                });
            });
        } catch(err){
            throw err;
        }
    }

    /*
    * Used to break the link/pair between merchant and customer
    * Params: mobileAccountNo, tokenNumber(easypaisa token no)
    * Return Type: Object
    * */
    deactivateLinkTransaction(mobileAccountNo, tokenNumber){
        try {
            let self = this;
            let data = {
                'request': {
                    'storeId': self.storeId,
                    'mobileAccountNo': mobileAccountNo,
                    'tokenNumber': tokenNumber
                }
            };
            return new Promise(function(resolve, reject) {
                self.generateSignature(data);
                resolve(self.signature);
                console.log('deactivateLinkTransaction: self.signature: ', self.signature);
            }).then(function(response){
                console.log('deactivateLinkTransaction: response 1: ', response);
                data.signature = response;
                axios({
                    method: 'post',
                    url: config.telenor_dcb_api_baseurl + 'eppinless/v1/deactivate-link',
                    data: data,
                    headers: {'Credentials': self.base64_cred, 'Authorization': 'Basic '+config.telenor_dcb_api_token, 'Content-Type': 'application/x-www-form-urlencoded' }
                }).then(function(response){
                    resolve(response.data);
                }).catch(function(err){
                    reject(err);
                });
            });
        } catch(err){
            return {'code': config.codes.code_error, 'message': err.message, 'method': 'deactivateLinkTransaction'};
        }
    }

    /*
    * Telenor Auth token - get token
    * Params: null
    * Return Type: Object
    * */
    getAuthToken(){
        try {
            let self = this;
            return new Promise(function(resolve, reject) {
                axios({
                    method: 'post',
                    url: config.telenor_dcb_api_baseurl + 'oauthtoken/v1/generate?grant_type=client_credentials',
                    headers: {'Credentials': self.base64_cred, 'Authorization': 'Basic '+config.telenor_dcb_api_token, 'Content-Type': 'application/x-www-form-urlencoded' }
                }).then(function(response){
                    resolve(response.data);
                }).catch(function(err){
                    reject(err);
                });
            });
        } catch(err){
            return {'code': config.codes.code_error, 'message': err.message, 'method': 'getAuthToken'};
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
                    url: 'https://apis.telenor.com.pk/epp/v1/generateotp',
                    data: data,
                    headers: {'Credentials': self.base64_cred, 'Authorization': 'Bearer '+config.telenor_dcb_api_token, 'Content-Type': 'application/json'}
                });

            if (resp.status === 200)
                return {'code': config.codes.code_success, 'message': 'OTP Sent'};
            else
                return {'code': config.codes.code_error, 'message': err.message};
        }catch (e) {
            return {'code': config.codes.code_error, 'message': err.message};
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
        console.log('getKey');
        this.privateKey = helper.easypaisaPrivateKey();
        console.log('this.privateKey', this.privateKey);
    }

    /*
    * Hash Algorithm using sha256
    * Private key is used to generate signature. Its length should be 2048 bits.
    * Params: null
    * Return Type: Object
    * */
    generateSignature(object){
        let trimmedData = JSON.stringify(object.request).replace(/(\\)?"\s*|\s+"/g, ($0, $1) => $1 ? $0 : '"');
        console.log('trim data ', trimmedData);
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
