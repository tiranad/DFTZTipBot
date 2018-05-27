const PrivateMessage = require('snoowrap').objects.PrivateMessage;
const {User, Job, Tip, Transaction} = require('../db');
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
    return new Promise(async (res) => {
        const addr = await getNewAddress();
        const newUser = new User({username: username, addr});
        res(await newUser.save());
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
    else if (!addr || addr.length !== 35 /*TODO CHANGE TO 34 FOR PIVX*/) return msg.reply(addr + " is not a valid PIVX address.");

    const user = await User.findOne({username: await msg.author.name});

    if (!user) {
        console.log('terst');
        await User.create({username: await msg.author.name});
    }

    return User.validateWithdrawAmount(user, amount).then(async () => {

        let pendingUserWithdrawJob = await Job.count({ name: "withdraw_order", "data.userId": user._id, completed: { $ne: true } });
        if (pendingUserWithdrawJob > 0) return 1;

        const job = global.agenda.create('withdraw_order', {userId: user._id, recipientAddress: addr, amount, txid: null });
        job.save((err) => {
            if (err) return false;

            return msg.reply('Withdrawing your coins. Check !transactions to confirm your tx.');
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

async function findHistory(username) {
    let user = await User.findOne({username: username});

    if (!user) user = createNewUser();

    const tips = await Tip.find({tipper: user._id});

    const recv = await Tip.find({tipped: user._id});

    return { tips, recv };
}

async function history(msg) {
    const { tips, recv } = await findHistory(await msg.author.name);

    let tip_msg = "Received tips:\n";

    for (let tip of recv) {
        const tipper = await User.findOne({_id:tip.tipper});
        tip_msg += `\n    From: ${tipper.username} | Amount: ${tip.amount} PIVX\n`;
    }

    let recv_msg = "Sent tips:\n";

    for (let tip of tips) {
        const tipped = await User.findOne({_id:tip.tipped});
        recv_msg += `\n   To: ${tipped.username} | Amount: ${tip.amount} PIVX\n`;
    }

    const text = tip_msg + "\n" + recv_msg;

    return msg.reply(text);
}

async function getTransactions (msg) {
    return new Promise(async (res, rej) => {
        const user = await User.findOne({username: await msg.author.name }) || await createNewUser();

        const options = {
            name: { $in: ["withdraw_order", "deposit_order"] },
            completed: { $ne: true },
            "data.userId": user._id
        };

        Job.find(options).limit(10).sort({ lastFinishedAt: 'desc' }).then((result) => {
            const data = result.map(row => row.toJSON());
            res(data);
        });

        const pending = await Job.find({ userId: user._id }).limit(10).sort({ lastFinishedAt: 'desc' }).map(row => row.toJSON());

        const txs = await Transaction.find({ userId: user._id }).limit(10).sort({ createdAt: 'desc' }).map(row => row.toJSON());

        res({ pending, txs });
    });
}

async function transactions(msg) {

    const { pending, txs } = await getTransactions(msg);

    let pend_msg = "Pending transactions:\n";

    for (let pend of pending) {
        if (pend.withdraw != "0.0") {
            pend_msg += `\nWithdraw Amount: ${pend.amount} PIVX | Pending`;
        } else {
            pend_msg += `\nDeposit Amount: ${pend.amount} PIVX  | Pending`;
        }
    }

    let tx_msg = "Sent tips:\n";

    for (let tx of txs) {
        if (tx.withdraw != "0.0") {
            tx_msg += `\nWithdraw Amount: ${tx.amount} PIVX | Pending`;
        } else {
            tx_msg += `\nDeposit Amount: ${tx.amount} PIVX  | Pending`;
        }
    }

    const text = pend_msg + "\n" + tx_msg;

    return msg.reply(text);

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
        await history(msg);
        break;
    case '!transactions':
        await transactions(msg);
        break;
    default:
        //handleInvalid
        await msg.reply(args[0] + " is an invalid command.");
    }

    await msg.markAsRead();

}

module.exports = async (client) => {


    setInterval(await handlePoll, 5000, client);

};
