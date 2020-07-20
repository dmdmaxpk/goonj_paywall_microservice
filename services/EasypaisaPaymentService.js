const axios = require('axios');
const config = require('./../config');
const helper = require('./../helper/helper');
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
   * Used to verify customer OPT and perform transaction for first time
   * Params: null
   * Return Type: Object
   * */
    async bootOptScript(msisdn){
        await this.getKey();
        let optData = this.generateOPT(msisdn);
        console.log('optData: ', optData);
    }

    /*
   * Used to verify customer OPT and perform transaction for first time
   * Params: null
   * Return Type: Object
   * */
    bootTransactionScript(msisdn, transactionAmount, easypaisaToken, opt){
        if (easypaisaToken !== undefined)
            this.initiatePinlessTransaction(msisdn, transactionAmount, easypaisaToken);
        else
            this.initiateLinkTransaction(msisdn, transactionAmount, opt);

        return {'code': config.codes.code_success, 'message': 'Signature is verifies successfully', 'method': 'verfiySignature'};

        return {'status': true, 'message': 'Opt script is executed successfully'};
    }

    /*
   * Used to verify customer OPT and perform transaction for first time
   * Params: null
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
    * Used to perform pinless Mobile Account transaction
    * Params: null
    * Return Type: Object
    * */
    initiatePinlessTransaction(mobileAccountNo, transactionAmount, tokenNumber){
        try {
            let data = {
                'request': {
                    'orderId': this.orderId,
                    'storeId': this.storeId,
                    'transactionAmount': transactionAmount,
                    'transactionType': 'MA',
                    'mobileAccountNo': mobileAccountNo,
                    'emailAddress': this.emailAddress,
                    'tokenNumber': tokenNumber,
                }
            };
            console.log('initiatePinlessTransaction: data: ', data);

            return new Promise(function(resolve, reject) {
                this.generateSignature(data);
                data.signature = this.signature;
                console.log('initiateLinkTransaction: data.signature: ', data.signature);
            }).then(function(response){
                console.log('initiatePinlessTransaction: response 1: ', response);
                axios({
                    method: 'post',
                    url: config.telenor_dcb_api_baseurl + 'eppinless/v1/initiate-pinless-transaction',
                    data: data,
                    headers: {'Authorization': 'Basic '+this.token, 'Content-Type': 'application/x-www-form-urlencoded' }
                }).then(function(response){
                    console.log('initiatePinlessTransaction: response 2: ', response.data);
                    resolve(response.data);
                    return {'code': config.codes.code_success, 'message': 'Pinless transaction is done successfully', 'method': 'initiatePinlessTransaction'};
                }).catch(function(err){
                    return {'code': config.codes.code_error, 'message': err.message, 'method': 'initiatePinlessTransaction'};
                });
            });
        } catch(err){
            return {'code': config.codes.code_error, 'message': err.message, 'method': 'initiatePinlessTransaction'};
        }
    }

    /*
    * Used to break the link/pair between merchant and customer
    * Params: null
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
    * Params: storeID, mobileAccountNo
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
    * Generate a unique ID for orderId parameter
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
    * RSA Encryption - get signature
    * Private key is used to generate signature. Its length should be 2048 bits.
    * Params: null
    * Return Type: Object
    * */
    getKey(){
        this.privateKey = helper.easypaisaPrivateKey();
    }
    /*
    * RSA Encryption - get signature
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