const db = require('../db');
const User = db.User;

module.exports = async (original, comment, amount) => {

    const _tipper = await original.author;
    const _receiver = await comment.author;
    console.log(typeof amount);


    const tipper = await User.findOne({username: _tipper.name});
    let receiver = await User.findOne({username: _receiver.name});


    if (!tipper) {
        const newTipper = new User({username: _tipper.name, balance: "0"});
        await newTipper.save();
        return Promise.reject();
    }

    if (!receiver) {
        const newReceiver = new User({username: _receiver.name, balance: "0"});
        await newReceiver.save();
        receiver = newReceiver;
    }

    await User.tip(tipper, receiver, amount).catch((err) => {
        if(err.message == "insufficient funds") return Promise.reject();
    });

    return Promise.resolve(true);


};
