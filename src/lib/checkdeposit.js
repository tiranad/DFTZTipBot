const {EventEmitter} = require('events');
const {User, Transaction} = require('../db');

class DepositEvent extends EventEmitter {

    constructor(time, rpc) {
        super();
        this.time = time;
        this.rpc = rpc;

        this.handleTXs = this.handleTXs.bind(this);
        this.depositCheck = this.depositCheck.bind(this);

        setInterval(this.depositCheck, time);
    }

    depositCheck() {
        this.checkDeposit().then(this.handleTXs);
    }

    async checkDeposit() {
        const txs = await this.rpc.listTransactions("test", 100);
        return new Promise(async (res) => {
            let newTXs = [];

            for (let tx of txs) {
                const acc = tx.account;
                if (acc == "test" && tx.category == "receive" && tx.txid) {
                    const re = await Transaction.find({ txid: tx.txid }).limit(1);
                    if (re.length == 0) newTXs.push(tx);
                }
            }

            res(newTXs);
        });
    }

    async handleTXs(txs) {
        const toInsert = [];

        for (let tx of txs) {
            const user = await User.find({ addr: tx.address }).limit(1);
            if (user[0]) {
                const amt = parseFloat(tx.amount);
                toInsert.push({ userId: user[0]._id, deposit: amt, txid: tx.txid });
            }
        }
        console.log(toInsert);
        await Transaction.insertMany(toInsert);

    }
}

module.exports = DepositEvent;
