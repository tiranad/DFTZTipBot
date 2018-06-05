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

        this.SATOSHI_VALUE = 1e-8;

    }

    async accountCreate() {
        return this.rpc.getNewAddress('test');
    }

    async send(addr, amount) {
        return this.rpc.sendToAddress(addr, amount);
    }

    async listTransactions() {
        return this.rpc.listUnspent();
    }

}


module.exports = PivxClient;
