const axios = require('axios')
const config = require('../config');

// To generate token to consume telenor dcb apis
sendSmsToUser =  (text,msisdn) => {
    sendTextMessage(text,msisdn);
}

module.exports = {
    sendSmsToUser: sendSmsToUser
}

function sendTextMessage(text, msisdn){
	let message = text;
	let messageObj = {};
	messageObj.message =  message;
    messageObj.msisdn = msisdn;
    
	if (messageObj.msisdn && messageObj.message) {
		console.log('Message Added in queue',messageObj);
		rabbitMq.addInQueue(config.queueNames.messageDispathcer, messageObj);
	} else {
		console.log('Critical parameters missing',messageObj.msisdn,messageObj.message);
	}
}