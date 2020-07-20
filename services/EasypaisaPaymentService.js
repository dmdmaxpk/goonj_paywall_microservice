const axios = require('axios');
const config = require('./../config');
const helper = require('./../helper/Helper');
const crypto = require("crypto");
const shortId = require('shortid');

class EasypaisaPaymentService {
    constructor(){
        this.token = config.telenor_dcb_api_token;
        this.emailAddress = 'muhammad.azam@dmdmax.com';
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
        await this.getKey();
        return this.generateOPT(msisdn);
    }

    /*
   * Used to initiate transaction using User OPT
   * Params: mobileAccountNo, transactionAmount, opt
   * Return Type: Object
   * */
    initiateLinkTransaction(mobileAccountNo, transactionAmount, opt){
        try {
            let data = {
                'request': {
                    'orderId': this.orderId,
                    'storeId': this.storeId,
                    'transactionAmount': transactionAmount,
                    'transactionType': 'MA',
                    'mobileAccountNo': mobileAccountNo,
                    'emailAddress': this.emailAddress,
                    'otp': opt,
                }
            };
            console.log('initiateLinkTransaction: data: ', data);

            return new Promise(function(resolve, reject) {
                this.generateSignature(data);
                data.signature = this.signature;
                console.log('initiateLinkTransaction: data.signature: ', data.signature);
            }).then(function(response){
                console.log('initiateLinkTransaction: response 1: ', response);
                axios({
                    method: 'post',
                    url: config.telenor_dcb_api_baseurl + 'eppinless/v1/initiate-link-transaction',
                    data: data,
                    headers: { 'Authorization': 'Basic '+this.token, 'Content-Type': 'application/x-www-form-urlencoded' }
                }).then(function(response){
                    console.log('initiateLinkTransaction: response 2: ', response.data);
                    return {'code': config.codes.code_success, 'message': 'Initiate transaction is done successfully', 'method': 'initiateLinkTransaction'};
                }).catch(function(err){
                    return {'code': config.codes.code_error, 'message': err.message, 'method': 'initiateLinkTransaction'};
                });
            });
        } catch(err){
            return {'code': config.codes.code_error, 'message': err.message, 'method': 'initiateLinkTransaction'};
        }
    }

    /*
    * Used to perform pinless Mobile Account transaction using easypaisa MA token - mainly used in renewal subscription
    * Params: msisdn(mobileAccountNo), packageObj(user package info), transaction_id(user transaction ID), subscription(Subscription data)
    * Return Type: Object
    * */
    initiatePinlessTransaction(msisdn, packageObj, transaction_id, subscription){
        
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
                console.log('initiateLinkTransaction: data.signature: ', data.signature);
            }).then(function(response){
                console.log('initiatePinlessTransaction: response 1: ', response);
                data.signature = response;
                axios({
                    method: 'post',
                    url: config.telenor_dcb_api_baseurl + 'eppinless/v1/initiate-pinless-transaction',
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
    deactivateLinkTransaction(mobileAccountNo, tokenNumber){
        try {
            return new Promise(function(resolve, reject) {
                axios({
                    method: 'post',
                    url: config.telenor_dcb_api_baseurl + 'eppinless/v1/deactivate-link',
                    data: {
                        'request': {
                            'storeId': this.storeId, //'16025'
                            'mobileAccountNo': mobileAccountNo, //'03451234567'
                            'tokenNumber': tokenNumber //0000002991
                        },
                        'signature': this.signature
                    },
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
    getAuthToken(){
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
        let data = {
            'request': {
                'storeId': this.storeId,
                'mobileAccountNo': mobileAccountNo
            }
        };
        return new Promise(function(resolve, reject) {
            this.generateSignature(data);
            data.signature = this.signature;
            console.log('generateOPT: data.signature: ', data.signature);
        }).then(function(response){
            console.log('generateOPT: response 1: ', response);
            axios({
                method: 'post',
                url: config.telenor_dcb_api_baseurl + 'eppinless/v1/generate-otp',
                data: data,
                headers: {'Authorization': 'Basic '+this.token, 'Content-Type': 'application/x-www-form-urlencoded' }
            }).then(function(response){
                console.log('generateOPT: response 2: ', response);
                return {'code': config.codes.code_success, 'message': 'OPT is generated successfully', 'method': 'generateOPT'};
            }).catch(function(err){
                return {'code': config.codes.code_error, 'message': err.message, 'method': 'generateOPT'};
            });
        }).catch(function(err){
            return {'code': config.codes.code_error, 'message': err.message, 'method': 'generateOPT'};
        });
    }

    /*
    * Generate a unique ID for orderId parameter
    * Params: null
    * Return Type: Object
    * */
    getOrderId() {
        this.orderId = "GoonjEasypaisa_"+shortId.generate()+"_"+helper.getCurrentDate();
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
        try {
            let hash = crypto.createHmac('sha256', this.privateKey)
                .update(JSON.stringify(object.request))
                .digest('hex');

            console.log('hash: ', hash);
            this.signature = hash;
            return {'code': config.codes.code_success, 'message': 'Signature is generated successfully', 'method': 'generateSignature'};
        } catch(err){
            return {'code': config.codes.code_error, 'message': err.message, 'method': 'generateSignature'};
        }
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
