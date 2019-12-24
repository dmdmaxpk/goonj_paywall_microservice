var connection = amqp.createConnection({ host: '127.0.0.1' });

// Create a queue
var q = connection.queue('messagingQueue', function (queue) {
    console.log('Queue ' + queue.name + ' is open');
});

subscribeToQueue = async() => {
    q.subscribe((message, headers, deliveryInfo, messageObject) => {
        console.log('Got a message with routing key ' + deliveryInfo.routingKey);
        console.log('Got a message '+ messageObject);
    });
}


module.exports = {
    subscribeToQueue: subscribeToQueue
}