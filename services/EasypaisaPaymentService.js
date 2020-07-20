const axios = require('axios');
const config = require('./../config');
const helper = require('./../helper/helper');
const crypto = require("crypto");
const shortId = require('shortid');
const userRepo = container.resolve("userRepository");

class EasypaisaPaymentService {
    constructor(){
        this.token = config.telenor_dcb_api_token;
        this.emailAddress = 'muhammad.azam@dmdmax.com';
        this.storeName = 'DMD';
        this.storeId = '10631';
        this.orderId = this.getOrderId();
        this.otp = null;
        this.signature = null;
        this.publicKey = null;
        this.privateKey = null;
        this.username = 'DMD';
        this.password = '3dca201bc26a31247bb4c6fbd1858468';
    }

    /*
   * Used to verify customer OPT and perform transaction for first time
   * Params: null
   * Return Type: Object
   * */
    async bootOptScript(msisdn){
        await this.getKeys(msisdn);
        let optData = await this.generateOPT(msisdn);
        console.log('optData: ', optData);

        return {'status': true, 'message': 'Opt script is executed successfully'};
    }

    /*
   * Used to verify customer OPT and perform transaction for first time
   * Params: null
   * Return Type: Object
   * */
    async bootTransactionScript(msisdn, transactionAmount){
        await this.initiateTransaction(msisdn, transactionAmount);
        return {'status': true, 'message': 'Opt script is executed successfully'};
    }

    /*
   * Used to verify customer OPT and perform transaction for first time
   * Params: null
   * Return Type: Object
   * */
    async initiateTransaction(msisdn, transactionAmount, opt){
        let user = await userRepo.getUserByMsisdn(msisdn);
        if (user.hasOwnProperty('easypaisaToken')){
            this.initiatePinlessTransaction(msisdn, transactionAmount, user.easypaisaToken)
        } else{
            this.initiateLinkTransaction(msisdn, transactionAmount, opt, user);
        }
    }

    /*
   * Used to verify customer OPT and perform transaction for first time
   * Params: null
   * Return Type: Object
   * */
    initiateLinkTransaction(mobileAccountNo, transactionAmount, opt, userData){
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
                },
                'signature': this.signature
            };
            console.log('initiateLinkTransaction: data: ', data);

            return new Promise(function(resolve, reject) {
                this.generateSignature(data);
                data.signature = this.signature;
            }).then(function(response){
                console.log('initiateLinkTransaction: response 1: ', response);
                axios({
                    method: 'post',
                    url: config.telenor_dcb_api_baseurl + 'eppinless/v1/initiate-link-transaction',
                    data: data,
                    headers: {'Authorization': 'Basic '+this.token, 'Content-Type': 'application/x-www-form-urlencoded' }
                }).then(function(response){
                    console.log('initiateLinkTransaction: response 2: ', response.data);
                    resolve(response.data);

                    userData.tokenNumber = response.data.response.tokenNumber;
                    userRepo.updateUser(mobileAccountNo, userData);
                }).catch(function(err){
                    reject(err);
                });
            });
        } catch(err){
            return {'status': false, 'message': err};
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
                },
                'signature': this.signature
            };
            console.log('initiatePinlessTransaction: data: ', data);

            return new Promise(function(resolve, reject) {
                this.generateSignature(data);
                data.signature = this.signature;
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
                }).catch(function(err){
                    reject(err);
                });
            });
        } catch(err){
            return {'status': false, 'message': err};
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
            return {'status': false, 'message': err};
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
            return {'status': false, 'message': err};
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
            },
            'signature': this.signature
        };
        return new Promise(function(resolve, reject) {
            this.generateSignature(data);
            data.signature = this.signature;
        }).then(function(response){
            console.log('generateOPT: response 1: ', response);
            axios({
                method: 'post',
                url: config.telenor_dcb_api_baseurl + 'eppinless/v1/generate-otp',
                data: data,
                headers: {'Authorization': 'Basic '+this.token,
                    'Content-Type': 'application/x-www-form-urlencoded' }
            }).then(function(response){
                console.log('generateOPT: response 2: ', response);
                resolve(response.data.response);
            }).catch(function(err){
                reject(err.response);
            });
        }).catch(function(err){
            reject(err.response);
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
        return {'status': true, 'message': 'Keys are created successfully'};
    }

    /*
    * Generate a unique ID for orderId parameter
    * Params: null
    * Return Type: Object
    * */
    saveKeys(msisdn, postData) {
        postData.easypaisa_public_key = this.publicKey;
        postData.easypaisa_privet_key = this.privateKey;
        userRepo.updateUser(msisdn, postData);
    }

    /*
    * RSA Encryption - get signature
    * Private key is used to generate signature. Its length should be 2048 bits.
    * Params: null
    * Return Type: Object
    * */
    async getKeys(msisdn){
        try {
            let user = await userRepo.getUserByMsisdn(msisdn);
            if (Object.hasOwnProperty(user.easypaisa_public_key)) {
                this.publicKey = user.easypaisa_public_key;
                this.privateKey = user.easypaisa_privet_key;
            } else{
                await this.generateKeys();
                await this.saveKeys(msisdn, user);
            }
        } catch(err){
            return {'status': false, 'message': err};
        }
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
            return {'status': true, 'message': 'Signature is created successfully'};
        } catch(err){
            return {'status': false, 'message': err};
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

            return {'status': true, 'message': 'Signature is verified successfully'};
        } catch(err){
            return {'status': false, 'message': err};
        }
    }
}

module.exports = PaywallService;