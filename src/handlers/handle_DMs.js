const PrivateMessage = require('snoowrap').objects.PrivateMessage;
const {User, Job} = require('../db');
const PivxClient = require('../lib/pivx_client');
const PIVXClient = new PivxClient();

async function filterMessages(arr) {
    const newArr = [];
    for (let msg of arr) {
        if (msg instanceof PrivateMessage) newArr.push(msg);
    }
    return newArr;
}

async function handlePoll(client) {
    const _msgs = await client.getUnreadMessages();

    const msgs = await filterMessages(_msgs, client);


    for (let msg of msgs) {
        await handlePrivateMessage(msg);
    }
}

async function createNewUser(username) {
    return new Promise(async (res, rej) => {
        const addr = await getNewAddress();
        const newUser = new User({username: username, addr});
        await newUser.save();
    });
}

async function getNewAddress() {
    return PIVXClient.accountCreate().catch((err) => {
        if (err) return err;
    });
}

async function updateUser(user) {
    return new Promise(async (res, rej) => {
        const addr = await getNewAddress();
        user.addr = addr;
        user.save((err) => {
            if (err) rej(err);
            res(user);
        });
    });
}

async function deposit(msg) {
    let user = await User.findOne({username: await msg.author.name});

    if (!user) user = createNewUser(await msg.author.user);
    else user = await updateUser(user);

    return msg.reply('Your deposit address is: ' + user.addr);
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

async function balance(msg) {

    let user = await User.findOne({username: await msg.author.name});

    if (!user) user = createNewUser();

    return msg.reply('Your balance is ' + user.balance + " PIVX");

}

async function handlePrivateMessage(msg) {

    const args = msg.body.match(/\S+/g);

    console.log('Handling message..');


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
        await balance(msg);
        break;
    case '!history':
        //tip history
        break;
    default:
        //handleInvalid
        console.log(args[0]);
    }

    await msg.markAsRead();

}

module.exports = async (client) => {


    setInterval(await handlePoll, 5000, client);

};
