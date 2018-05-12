const mongoose = require('mongoose');
const uuid_util = require('uuid');
const Decimal = require("decimal.js");


let s = {
    name: "User",
    schema: new mongoose.Schema({
        username: {
            type: String,
            unique: true
        },
        balance: {
            type: mongoose.Schema.Types.Decimal128,
            default: "0.0"
        },
    },{
        timestamps: true
    })
};

s.schema.statics.authUser = async function(token) {
    return new Promise(async (res) => {
        let user = await this.findOne({token: token});
        if (user != null) res(user);
        else res(false);
    });
};

s.schema.statics.authCertainUser = async function (token, username) {
    return new Promise(async (res) => {
        let user = await this.findOne({token: token});
        if (user != null && user.username == username) res(user);
        else res(false);
    });
};

s.schema.statics.updateToken = function (data) {
    let key = uuid_util.v4();
    return this.findOneAndUpdate({username: data.username},{token: key}, { new: true });
};

s.schema.statics.resetToken = async function (token) {
    return new Promise(res => {
        let key = uuid_util.v4();
        this.findOneAndUpdate({token: token},{token: key}, { new: true }).then(doc => {
            if (doc) res(key);
            else res(null);
        });
    });
};

s.schema.statics.tip = async function (tipper, receiver, amount) {
    return this.validateWithdrawAmount(tipper, amount).then(() => {
        return this.findOneAndUpdate({ username: tipper.username }, { $inc : {'balance' : Decimal(0).minus(Decimal(amount)).toFixed() } }).then(() => {
            return this.findOneAndUpdate({ username: receiver.username }, { $inc : {'balance' : Decimal(amount).toFixed() } });
        });
    });
};

s.schema.statics.deposit = async function (user, amount) {
    return this.validateDepositAmount(user, amount).then(() => {
        return this.findOneAndUpdate({ "token": user.token }, { $inc : {'balance' : Decimal(amount).toFixed() } });
    });
};

s.schema.statics.withdraw = async function (user, amount) {
    return this.validateWithdrawAmount(user, amount).then(() => {
        return this.findOneAndUpdate({ "token": user.token }, { $inc : {'balance' : Decimal(0).minus(Decimal(amount)).toFixed() } });
    });
};

s.schema.statics.validateDepositAmount = function (user, amount) {
    if (amount <= 0) return Promise.reject({ message: "zero or negative amount not allowed" });

    return Promise.resolve({});
};

s.schema.statics.validateWithdrawAmount = async function (user, amount) {
    amount = parseFloat(amount);

    if (isNaN(amount)) return Promise.reject({ message: "amount is not a number" });
    if (amount <= 0) return Promise.reject({ message: "zero or negative amount not allowed" });
    if (amount > user.balance) return Promise.reject({ message: "insufficient funds" });

    return Promise.resolve({});
};





module.exports = mongoose.model(s.name, s.schema);
