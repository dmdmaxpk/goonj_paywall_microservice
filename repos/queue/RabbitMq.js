const   config = require('../../config');
const amqp = require('amqplib/callback_api');

var rabbitMq;

class RabbitMq {
    constructor() {
        this.connection = null;
        this.channel = null;
    }

    createConnection(callback){
        amqp.connect(config.rabbitMq, (error, connection) => {
            if (error) {
                console.log('connection error: ', error);
                callback(error);
            }else{
                callback(null, connection);
                this.connection = connection;
            }
          });
    }

    createChannel(connection, callback){
        connection.createChannel(function(error, channel) {
            if (error) {
              callback(error);
            }
            channel.prefetch(1);
            callback(null, channel);
        });
    }

    initializeMesssageServer(callback) {
        this.createConnection((err,connection) => {
            if (err) {
                console.log('connection error: ', err);
                callback(err);
            } else {
                this.createChannel(connection, (error, channel) => {
                    if (error) {
                        console.log('error', error);
                        callback(error);
                    } else {
                        this.conection = connection;
                        this.channel = channel;
                        callback(null, channel);
                    }
                });
            }
        });
    }

    createQueue(name, durable = true){
        this.channel.assertQueue(name, {durable: durable});
    }

    consumeQueue(queue, callback){
        this.channel.consume(queue, async (msg) =>  {
            callback(msg);
            setTimeout(() => {
                this.channel.ack(msg);
              }, 1000);
          }, 
          {
            noAck: false
        });
    }

    sendMessage(queue, message){
        let buffer = Buffer.from(JSON.stringify(message));
        this.channel.sendToQueue(queue, buffer, {persistent:true});
    }
}    
  
if(!rabbitMq){
    rabbitMq = new RabbitMq();
}

module.exports = {
    rabbitMq: rabbitMq
};
