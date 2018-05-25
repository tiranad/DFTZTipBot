const PrivateMessage = require('snoowrap').objects.PrivateMessage;
const {User, Job} = require('../db');

async function filterMessages(arr) {
    const newArr = [];
    for (let msg of arr) {
        if (msg instanceof PrivateMessage) newArr.push(msg);
    }
    return newArr;
}

async function handlePoll(client) {
    const _msgs = await client.getUnreadMessages();
    const msgs = await filterMessages(_msgs);

    for (let msg of msgs) {
        await handlePrivateMessage(msg);
    }
}

async function deposit(msg) {

    const user = User.findOne({username: msg.username});

    if (!user) {

        const newUser = new User({username: await msg.username});
        await newUser.save();

        const job = global.agenda.create("account_create", {userId: newUser._id});

        job.save((err, doc) => {
            if (err) return false;

            user.addr = doc.addr;
        });

    }

    const addr = user.addr;

    return msg.reply('Your deposit address is: ' + addr);
}

async function withdraw(msg, args) {

    const amount = parseInt(args[1]);
    const addr = args[2];

    if (isNaN(amount)) return msg.reply(args[1] + " is not a valid amount.");
    else if (!addr || addr.length !== 34) return msg.reply(addr + " is not a valid PIVX address.");

    const user = User.findOne({username: await msg.username});

    if (!user) {
        const newTipper = new User({username: await msg.username, balance: "0"});
        await newTipper.save();
    }

    return User.validateWithdrawAmount(user, amount).then(async () => {

        let pendingUserWithdrawJob = await Job.count({ name: "withdraw_order", "data.userId": user._id, completed: { $ne: true } });
        if (pendingUserWithdrawJob > 0) return 1;

        const job = global.agenda.create('withdraw_order', {userId: user._id, recipientAddress: addr, amount: amount});
        job.save((err) => {
            if (err) return false;

            return true;
        });
    }).catch(() => {
        //TODO handle
    });
}

async function balance(msg, user) {

    if (!user) {
        const newTipper = new User({username: msg.username, balance: "0"});
        await newTipper.save();
    }



}

async function handlePrivateMessage(msg) {

    const args = msg.body.match(/\S+/g);



    switch (args[0]) {
    case '!deposit':
        //deposit address
        await deposit(msg);
        break;
    case '!withdraw':
        //withdraw amount confirmation -> handleWithdraw
        await withdraw(msg, args);
        break;
    case '!balance':
        //balance
        await balance(args[0]);
        break;
    case '!history':
        //tip history
        break;
    default:
        //handleInvalid
    }

    await msg.markAsRead();

}

module.exports = async (client) => {

    setInterval(await handlePoll, 5000, client);

};
