const axios = require('axios');
const config = require('./../config');
const helper = require('./../helper/helper');
const crypto = require("crypto");
const shortId = require('shortid');
const e = require('express');

class EasypaisaPaymentService {
    constructor(){
        this.token = config.telenor_dcb_api_token;
        this.emailAddress = 'muhammad.azam@dmdmax.com';
        this.username = 'DMD',
        this.password = '3dca201bc26a31247bb4c6fbd1858468',
        this.storeId = '10631';
        this.orderId = this.getOrderId();
        this.signature = null;
        this.publicKey = null;
        this.privateKey = null;
    }

    /*
   * Boot the script to get new User OPT
   * Params: msisdn (user mobile number)
   * Return Type: Object
   * */
    async bootOptScript(msisdn){
        try{
            console.log('bootOptScript 1');
            await this.getKey();
            console.log('bootOptScript 2');
            return this.generateOPT(msisdn);
        }catch(err){
            console.log('bootOptScript - err', err);
        }
        
    }

    /*
   * Used to initiate transaction using User OPT
   * Params: mobileAccountNo, transactionAmount, opt
   * Return Type: Object
   * */
    async initiateLinkTransaction(mobileAccountNo, transactionAmount, otp){
        try {
            let data = {
                'request': {
                    'orderId': this.orderId,
                    'storeId': this.storeId,
                    'transactionAmount': transactionAmount,
                    'transactionType': 'MA',
                    'mobileAccountNo': mobileAccountNo,
                    'emailAddress': this.emailAddress,
                    'otp': otp,
                }
            };
            console.log('initiateLinkTransaction: data: ', data);

            return new Promise(function(resolve, reject) {
                this.generateSignature(data);
                resolve(this.signature);
                console.log('initiateLinkTransaction: this.signature: ', this.signature);
            }).then(function(response){
                data.signature = response;
                console.log('initiateLinkTransaction: response 1: ', response);
                axios({
                    method: 'post',
                    //url: config.telenor_dcb_api_baseurl + 'eppinless/v1/initiate-link-transaction',
                    url: 'https://telenor.com.pk/epp/v1/initiatelinktransaction',
                    data: data,
                    headers: { 'Authorization': 'Basic '+this.token, 'Content-Type': 'application/x-www-form-urlencoded' }
                }).then(function(response){
                    console.log('initiateLinkTransaction: response 2: ', response.data);
                    return response.data.response;
                }).catch(function(error){
                    console.log('initiateLinkTransaction error 1: ', error);
                    throw error;
                });
            });
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
    async initiatePinlessTransaction(msisdn, packageObj, transaction_id, subscription){
        
        let returnObject = {};
        returnObject.packageObj = packageObj;
        returnObject.msisdn = msisdn;
        returnObject.transactionId = transaction_id;
        returnObject.subscription = subscription;

        try {
            let data = {
                'request': {
                    'orderId': this.orderId,
                    'storeId': this.storeId,
                    'transactionAmount': packageObj.price_point_pkr,
                    'transactionType': 'MA',
                    'mobileAccountNo': msisdn,
                    'emailAddress': this.emailAddress,
                    'tokenNumber': subscription.ep_token,
                }
            };
            console.log('initiatePinlessTransaction: data: ', data);

            return new Promise(function(resolve, reject) {
                this.generateSignature(data);
                resolve(this.signature);
                console.log('initiateLinkTransaction: this.signature: ', this.signature);
            }).then(function(response){
                console.log('initiatePinlessTransaction: response 1: ', response);
                data.signature = response;
                axios({
                    method: 'post',
                    //url: config.telenor_dcb_api_baseurl + 'eppinless/v1/initiate-pinless-transaction',
                    url: 'https://telenor.com.pk/epp/v1/initiatepinlesstransaction',
                    data: data,
                    headers: {'Authorization': 'Basic '+this.token, 'Content-Type': 'application/x-www-form-urlencoded' }
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
    async deactivateLinkTransaction(mobileAccountNo, tokenNumber){
        try {
            let data = {
                'request': {
                    'storeId': this.storeId,
                    'mobileAccountNo': mobileAccountNo,
                    'tokenNumber': tokenNumber
                }
            };
            return new Promise(function(resolve, reject) {
                this.generateSignature(data);
                resolve(this.signature);
                console.log('deactivateLinkTransaction: this.signature: ', this.signature);
            }).then(function(response){
                console.log('deactivateLinkTransaction: response 1: ', response);
                data.signature = response;
                axios({
                    method: 'post',
                    url: config.telenor_dcb_api_baseurl + 'eppinless/v1/deactivate-link',
                    data: data,
                    headers: {'Authorization': 'Basic '+this.token,
                        'Content-Type': 'application/x-www-form-urlencoded' }
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
    async getAuthToken(){
        try {
            return new Promise(function(resolve, reject) {
                axios({
                    method: 'post',
                    url: config.telenor_dcb_api_baseurl + 'oauthtoken/v1/generate?grant_type=client_credentials',
                    headers: {'Authorization': 'Basic '+this.token,
                        'Content-Type': 'application/x-www-form-urlencoded' }
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
    * Telenor Opt - Merchant app call to get user opt
    * Private key is used to generate signature
    * Params: mobileAccountNo
    * Return Type: Object
    * */
    generateOPT(mobileAccountNo){
        console.log('generateOPT', mobileAccountNo);
        let data = {
            'request': {
                'storeId': this.storeId,
                'mobileAccountNo': mobileAccountNo
            }
        };
        var self = this;
        return new Promise(function(resolve, reject) {
            self.generateSignature(data);
            resolve(self.signature);
            console.log('generateOPT: this.signature: ', this.signature);
        }).then(function(response){
            data.signature = response;
            console.log('generateOPT: response 1: ', response);
            let cred = Buffer.from(self.username+":"+self.password).toString('base64');
            axios({
                method: 'post',
                //url: config.telenor_dcb_api_baseurl + 'eppinless/v1/generate-otp',
                url: 'https://telenor.com.pk/epp/v1/generateotp',
                data: data,
                headers: {"Credentials": cred }
            }).then(function(response){
                console.log('generateOPT: response 2: ', response);
                return {'code': config.codes.code_success, 'message': 'OPT is generated successfully', 'method': 'generateOPT'};
            }).catch(function(err){
                console.log('generateOPT: err 1', err);
                return {'code': config.codes.code_error, 'message': err.message, 'method': 'generateOPT'};
            });
        }).catch(function(err){
            console.log('generateOPT: err 2', err);
            return {'code': config.codes.code_error, 'message': err.message, 'method': 'generateOPT'};
        });
    }

    /*
    * Generate a unique ID for orderId parameter
    * Params: null
    * Return Type: Object
    * */
    async getOrderId() {
        this.orderId = "GoonjEasypaisa_"+shortId.generate()+"_"+helper.getCurrentDate();
    }

    /*
    * RSA Encryption
    * Used to generate random Public and Private keys that will be used to generate signature for each Easypaisa & Telenor endpoint call.
    * Params: null
    * Return Type: Object
    * */
    async generateKeys() {
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
    async getKey(){
        console.log('getKey')
        this.privateKey = helper.easypaisaPrivateKey();
        console.log('this.privateKey', this.privateKey);
    }

    /*
    * Hash Algorithm using sha256
    * Private key is used to generate signature. Its length should be 2048 bits.
    * Params: null
    * Return Type: Object
    * */
    async generateSignature(object){
        try {
            console.log('generateSignature', object);
            const mySignature = crypto.sign("sha256", Buffer.from(object.request), {
                key: this.privateKey,
                padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
            });
            console.log('mySignature', mySignature);
            console.log('generateSignature - signature: ', mySignature);
            this.signature = mySignature;
            return {'code': config.codes.code_success, 'message': 'Signature is generated successfully', 'method': 'generateSignature'};
        } catch(err){
            console.log('mySignature', err);
            return {'code': config.codes.code_error, 'message': err.message, 'method': 'generateSignature'};
        }
    }

    /*
    * RSA Encryption - verify the signature
    * Public key is used to verify the signature. Its length should be 2048 bits.
    * Params: null
    * Return Type: Object
    * */
    async verfiySignature(){
        try {
            return {'code': config.codes.code_success, 'message': 'Signature is verifies successfully', 'method': 'verfiySignature'};
        } catch(err){
            return {'code': config.codes.code_error, 'message': err.message, 'method': 'verfiySignature'};
        }
    }
}

module.exports = EasypaisaPaymentService;
