const Bitcoin = require('bitcoin-core');

const client = new Bitcoin({
    port: 33333,
    username: "test",
    password: "test"
});
//client.getNewAddress().then(console.log);
client.listReceivedByAccount(0).then(console.log);
