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

    async getAccountInfo(account) {
        return this.rpc.post('/', {"action": "account_info", "account": account}).then((response) => {
            let result = response.data;
            return Promise.resolve(result);
        });
    }

    async processReceive(pendingBlockhash, account, wallet) {
        return this.rpc.post('/', {"action": "receive", "wallet": wallet, "account": account, "block": pendingBlockhash }).then((response) => {
            let result = response.data;
            return Promise.resolve(result);
        });
    }

}

PivxClient.MRAI_RAW_VALUE = 1000000000000000000000000000000;


module.exports = PivxClient;
