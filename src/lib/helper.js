const Request = require("request-promise");
const UUID = require("uuid");
const {User, Transction} = require('../db');
const Bitcore = require("bitcore-lib");
const client = require('./pivx_client');

class Helper {

    constructor(host, bucket, username, password, seed) {
        this.master = seed;
    }

    createKeyPair(account) {
        account = this.master.deriveChild(account);
        let key = account.deriveChild(Math.random() * 10000 + 1);
        return { "secret": key.privateKey.toWIF().toString(), "address": key.privateKey.toAddress().toString()  };
    }

    getWalletBalance(addresses) {
        var promises = [];
        for(var i = 0; i < addresses.length; i++) {
            promises.push(Request("https://chainz.cryptoid.info/pivx/api.dws?q=getbalance&a=" + addresses[i]));
        }
        return Promise.all(promises).then(result => {
            var balance = result.reduce((a, b) => a + JSON.parse(b).balanceSat, 0);
            return new Promise((resolve) => {
                resolve({ "balance": balance });
            });
        });
    }

    getAddressBalance(address) {
        return Request("https://chainz.cryptoid.info/pivx/api.dws?q=getbalance&a=" + address);
    }

    getAddressUtxo(address) { }

    insert(data) {
        return new Promise((resolve, reject) => {
            User.create(data, (error, result) => {
                if(error) {
                    reject({ "code": error.code, "message": error.message });
                }
                resolve(data);
            });
        });
    }

    createAccount(data) {
        return new Promise((resolve, reject) => {
            this.bucket.counter("accounts::total", 1, { "initial": 1 }, (error, result) => {
                if(error) {
                    reject({ "code": error.code, "message": error.message });
                }
                data.account = result.value;
                this.insert(data).then(result => {
                    resolve(result);
                }, error => {
                    reject(error);
                });
            });
        });
    }

    addAddress(account) { }

    getAccountBalance(account) { }

    getMasterAddresses() { }

    getMasterKeyPairs() {
        var keypairs = [];
        var key;
        var account = this.master.deriveChild(0);
        for(var i = 1; i <= 10; i++) {
            key = account.deriveChild(i);
            keypairs.push({ "secret": key.privateKey.toWIF().toString(), "address": key.privateKey.toAddress().toString() });
        }
        return keypairs;
    }

    getMasterAddressWithMinimum(addresses, amount) {
        var promises = [];
        for(var i = 0; i < addresses.length; i++) {
            promises.push(Request("https://insight.bitpay.com/api/addr/" + addresses[i]));
        }
        return Promise.all(promises).then(result => {
            for(var i = 0; i < result.length; i++) {
                if(result[i].balanceSat >= amount) {
                    return new Promise(resolve => resolve({ "address": result[i].addrStr }));
                }
            }
            new Promise(reject => reject({ "message": "Not enough funds in exchange" }));
        });
    }

    getMasterChangeAddress() {
        let account = this.master.deriveChild(0);
        let key = account.deriveChild(Math.random() * 10 + 1);
        return { "secret": key.privateKey.toWIF().toString(), "address": key.privateKey.toAddress().toString() };
    }

    getAddresses(account) { }

    getPrivateKeyFromAddress(account, address) { }

    createTransactionFromAccount(account, source, destination, amount) { }

    createTransactionFromMaster(account, destination, amount) { }

}

module.exports = Helper;
