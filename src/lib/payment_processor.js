global.srcRoot = require('path').resolve('./');
const models = require('../db');

const config = require('../data/config.json')[global.env];

const PIVXClient = require('./pivx_client.js');
const Decimal = require("decimal.js");
const utils = require('./../utils');

class PaymentProcessor {

    constructor(options) {
        this.agenda         = options.agenda;
        this.pivxClient     = options.pivxClient || new PIVXClient("https://144.217.240.174/nano_api", config.nano_api_key);
        this.wallet         = options.wallet;
        this.masterAccount  = options.masterAccount;
    }

    async performWithdraw(options) {
        try {
            await this.withdraw(options);
            return { success: true };
        } catch(e) {
            this.reportException(e);
            return { error: e };
        }
    }

    async performDeposit(options) {
        try {
            await this.deposit(options);
            return { success: true };
        } catch(e) {
            this.reportException(e);
            return { error: e };
        }
    }

    async checkPending(options = {}) {
        try {
            const pending = await this.pivxClient.getPending(this.wallet);

            for (let recipientAddress in pending.blocks) {
                for (let blockHash in pending.blocks[recipientAddress]) {
                    let blockData = pending.blocks[recipientAddress][blockHash];

                    // console.log(`Found pending block: ${blockHash} for address: ${recipientAddress}`);
                    await this.createDepositOrder(blockHash, recipientAddress, blockData.amount);
                }
            }
        } catch(e) {
            this.reportException(e);
        }

        if (options.repeat) {
            setTimeout(() => { this.checkPending(options); }, 3000);
        }
    }

    async createDepositOrder(blockHash, recipientAddress, rawAmount) {
        let job = await models.Job.findOne({ "data.block": blockHash  });

        if (!job) {
            job = this.agenda.create('deposit_order', { recipientAddress: recipientAddress, block: blockHash, rawAmount: rawAmount });
            return new Promise((res, rej) => {
                job.save((err) => {
                    if (err) return rej(err);
                    return res(job);
                });
            });
        }

        return job;
    }


    /*
        amount: {String}
    */
    async withdraw(job) {
        // parameters
        const userId            = job.attrs.data.userId;
        const recipientAddress  = job.attrs.data.recipientAddress;
        const amount            = job.attrs.data.amount;

        // Validate if user is present
        let user = await models.User.findById(userId);
        if (!user) throw new Error(`User ${userId} not found`);
        await models.User.validateWithdrawAmount(user, amount);

        // Step 1: Process Nano transaction
        let sendBlock;

        if (job.attrs.nanoStepCompleted) {
            sendBlock = job.attrs.sendBlock;
        } else {
            sendBlock = await this.pivxClient.processSend(this.wallet, this.masterAccount, recipientAddress, amount);
            if (sendBlock.error) throw new Error(sendBlock.error);
            await models.Job.findOneAndUpdate({ _id: job.attrs._id} , { "data.nanoStepCompleted": true, "data.sendBlock": sendBlock.block });
        }

        // Step 2: Update user balance
        if (!job.attrs.userStepCompleted) {
            await models.User.withdraw(user, amount, sendBlock.block);
            await models.Job.findByIdAndUpdate(job.attrs._id, { "data.userStepCompleted": true });
        }

        // Step 3: Record Transaction
        if (!job.attrs.transactionStepCompleted) {
            await models.Transaction.create({ userId: userId, withdraw: amount, block: sendBlock.block });
            await models.Job.findByIdAndUpdate(job.attrs._id, { "data.transactionStepCompleted": true });
        }

        return sendBlock.block;
    }

    async deposit(job) {
        // parameters
        const block            = job.attrs.data.block;
        const recipientAddress = job.attrs.data.recipientAddress;
        const rawAmount        = job.attrs.data.rawAmount;

        // Validate if user is present
        let user = await models.User.findOne({ address: recipientAddress });
        if (!user) throw new Error(`User with address ${recipientAddress} not found`);

        // Step 1: Process Nano transaction
        let receiveBlock;

        if (job.attrs.nanoStepCompleted) {
            receiveBlock = job.attrs.receiveBlock;
        } else {
            receiveBlock = await this.pivxClient.processReceive(block, recipientAddress, this.wallet);
            if (receiveBlock.error) throw new Error(receiveBlock.error);
            let result = await models.Job.findByIdAndUpdate(job.attrs._id, { "data.nanoStepCompleted": true, "data.receiveBlock": receiveBlock.block }, {new: true});
        }

        // Step 2: Update user balance + record transaction
        let amountInMRai = Decimal(rawAmount).div(this.pivxClient.MRAI_RAW_VALUE);

        if (!job.attrs.userStepCompleted) {
            await models.User.deposit(user, amountInMRai, receiveBlock.block);
            await models.Job.findByIdAndUpdate(job.attrs._id, { "data.userStepCompleted": true });
        }

        if (!job.attrs.transactionStepCompleted) {
            await models.Transaction.create({ userId: user.id, deposit: amountInMRai.toFixed(), block: receiveBlock.block });
            await models.Job.findByIdAndUpdate(job.attrs._id, { "data.transactionStepCompleted": true });
        }

        return receiveBlock;
    }

    generateAddress(user) {
      
    }

    reportException(e) {
        utils.ExceptionReporter.captureException(e);
    }

}

module.exports = PaymentProcessor;
