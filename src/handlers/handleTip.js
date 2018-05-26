const {User, Tip} = require('../db');

module.exports = async (original, comment, amount) => {
    return new Promise(async (res, rej) => {
        const _tipper = await original.author;
        const _receiver = await comment.author;


        const tipper = await User.findOne({username: _tipper.name});
        let receiver = await User.findOne({username: _receiver.name});


        if (!tipper) {
            const newTipper = new User({username: _tipper.name, balance: "0"});
            await newTipper.save();
            rej(0);
        }

        if (!receiver) {
            const newReceiver = new User({username: _receiver.name, balance: "0"});
            await newReceiver.save();
            receiver = newReceiver;
        }

        await User.tip(tipper, receiver, amount).then(() => {

            const tip = new Tip({tipper: tipper._id, tipped: receiver._id, amount});
            tip.save((err) => {
                if (err) rej(err);
            });

            res(true);
        }).catch((err) => {
            if(err.message == "insufficient funds") rej(1);


        });
    });
};
