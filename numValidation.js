const axios = require('axios')
const config = require('./config');

validateNumber = async () => {
    var form = { mode: 'raw', raw: '' };
    return new Promise(function(resolve, reject) {
        axios({
            method: 'get',
            url: config.telenor_dcb_api_baseurl + 'subscriberQuery/v0/checkinfo/03476733767',
            headers: [{
                "key": "Authorization",
				"value": "Bearer "+config.telenor_dcb_api_token,
				"description": ""
            }],
            data: form
        }).then(function(response){
            console.log(response.data);
            resolve(response.data);
        }).catch(function(err){
            console.log(err.response);
            reject(err);
        });
    });
}

module.exports = {
    validateNumber: validateNumber
}