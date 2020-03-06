const config = require('../config');
const axios = require('axios');

// GET
exports.get = async (req, res) => {
	let { msisdn } = req.params;
	if (msisdn) {
		checkBalance(msisdn).then(response => {
			res.send({code: config.codes.code_success, data: response});
		}).catch(err => {
			res.send({code: config.codes.code_error, error: err});
		});
	}
	else{
		res.send({code: config.codes.code_invalid_data_provided, message: 'Invalid msisdn'});
	}
}

checkBalance = async(msisdn) => {
    console.log('Check Balance - ', msisdn, ' - ',(new Date()));
    const transactionId = msisdn+"__"+(new Date().toDateString);
    var form = { correlationId: transactionId, recipientsMsisdn: msisdn};
    
    return new Promise(function(resolve, reject) {
        axios({
            method: 'post',
            url: config.telenor_dcb_api_baseurl + 'balanceinquiry/v1/fetch',
            headers: {'Authorization': 'Bearer '+config.telenor_dcb_api_token, 'Content-Type': 'application/json' },
            data: form
        }).then(function(response){
            console.log('Check Balance - ', msisdn, ' - Balance - ', response.data, ' - ',(new Date()));
            resolve(response.data);
        }).catch(function(err){
            console.log('Check Balance - ', msisdn, ' - Error - ', err, ' - ',(new Date()));
            reject(err);
        });
    })
};