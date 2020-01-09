const axios = require('axios')
const config = require('./config');

validateNumber = async () => {
    var form = { mode: 'raw', raw: '' };
    return new Promise(function(resolve, reject) {
        axios({
            method: 'get',
            url: config.telenor_dcb_api_baseurl + 'subscriberQuery/v0/checkinfo/03476733767',
            headers: {'Authorization': 'Bearer '+config.telenor_dcb_api_token, 'Content-Type': 'application/json' },
            data: form
        }).then(function(response){
            console.log(response.data);
            resolve(response.data);
        }).catch(function(err){
            console.log(err);
            reject(err);
        });
    });
}

module.exports = {
    validateNumber: validateNumber
}