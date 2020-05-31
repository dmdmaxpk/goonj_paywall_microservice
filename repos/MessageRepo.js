const axios = require('axios')
const config = require('../config');

class MessageRepository {

	sendSmsToUser  (text, msisdn)  {
		this.sendTextMessage(text,msisdn);
	}

	sendTextMessage(text, msisdn){
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
}


module.exports = MessageRepository;