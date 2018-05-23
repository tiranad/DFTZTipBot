process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const axios = require('axios');
const Decimal = require('decimal.js');


class PivxClient {

    constructor(baseURL, apiKey) {
        if (!apiKey) throw new Error("Missing APIKey");
        this.rpc = axios.create({
            baseURL: baseURL,
            headers: {
                Authorization: `Basic ${apiKey}`
            }
        });
    }

    async getPending(wallet) {
        return this.rpc.post('/', {"action": "wallet_pending", "wallet": wallet, "count": "10", "source": "true"}).then((response) => {
            return Promise.resolve(response.data);
        });
    }

    async accountCreate(wallet) {
        return this.rpc.post('/', {"action": "account_create", "wallet": wallet }).then((response) => {
            return Promise.resolve(response.data);
        });
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

    async processSend(wallet, from, to, nanoAmount) {
        const rawAmount = Decimal(this.constructor.MRAI_RAW_VALUE).mul(nanoAmount).toFixed();

        return this.rpc.post('/', {"action": "send", "wallet": wallet, "source": from, "destination": to, "amount": rawAmount}).then((response) => {
            return Promise.resolve(response.data);
        });
    }

    async newAddress(wallet) {
      
    }
}

PivxClient.MRAI_RAW_VALUE = 1000000000000000000000000000000;


module.exports = PivxClient;
