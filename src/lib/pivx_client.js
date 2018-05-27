process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const Bitcoin = require('bitcoin-core');


class PivxClient {

    constructor() {
        //if (!apiKey) throw new Error("Missing APIKey");
        this.rpc = new Bitcoin({
            port: 33333,
            username: "test",
            password: "test"
        });
    }

    async accountCreate() {
        return this.rpc.getNewAddress();
    }

    async send(addr, amount) {
        return this.rpc.sendToAddress(addr, amount);
    }

}

PivxClient.SATOSHI_VALUE = 100000000;


module.exports = PivxClient;
