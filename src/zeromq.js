var zmq = require('zeromq')
    , sock = zmq.socket('sub');
const Bitcoin = require('bitcoin-core');

sock.connect('tcp://127.0.0.1:3000');
sock.subscribe('hashtx');
console.log('Worker connected to port 3000');

sock.on('message', function(topic, message){
    console.log(message.toString('hex'));
    rpc.getTransaction(message.toString('hex')).then(console.log);
});

const rpc = new Bitcoin({
    port: 33333,
    username: "test",
    password: "test"
});
