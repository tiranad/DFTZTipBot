const PrivateMessage = require('snoowrap').objects.PrivateMessage;
const {User, Job, Tip} = require('../db');
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
        if (!user.addr) {
            const addr = await getNewAddress();
            user.addr = addr;
            user.save((err) => {
                if (err) rej(err);
                res(user);
            });
        }
        res(user);
    });
}

async function deposit(msg) {
    let user = await User.findOne({username: await msg.author.name});

    if (!user) user = await createNewUser(await msg.author.name);
    else user = await updateUser(user);

    return msg.reply('Your **one-time** deposit address is: ' + user.addr);
}

async function withdraw(msg, args) {

    const amount = parseInt(args[1]);
    const addr = args[2];

    if (isNaN(amount)) return msg.reply(args[1] + " is not a valid amount.");
    else if (!addr || addr.length !== 34 ) return msg.reply(addr + " is not a valid PIVX address.");

    const user = await User.findOne({username: await msg.author.name});

    if (!user) {
        await User.create({username: await msg.author.name});
        return 1;
    }

    return User.validateWithdrawAmount(user, amount).then(async () => {

        let pendingUserWithdrawJob = await Job.count({ name: "withdraw_order", "data.userId": user._id, completed: { $ne: true } });
        if (pendingUserWithdrawJob > 0) return 1;

        const job = global.agenda.create('withdraw_order', {userId: user._id, recipientAddress: addr, amount });
        job.save((err) => {
            if (err) return false;

            return msg.reply('Withdrawing your coins. Check !transactions to confirm your tx.');
        });
    }).catch((message) => {
        //TODO handle
            return msg.reply(message);
    });
}

async function balance(msg) {

    let user = await User.findOne({username: await msg.author.name});

    if (!user) user = await createNewUser(await msg.author.name);

    return msg.reply('Your balance is ' + User.getBigBalance(user) + " PIVX");

}

async function findHistory(username) {
    let user = await User.findOne({username: username});

    if (!user) user = await createNewUser(username);

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
        const tipped = await User.findOne({ _id: tip.tipped });
        recv_msg += `\n   To: ${tipped.username} | Amount: ${tip.amount} PIVX\n`;
    }

    const text = tip_msg + "\n" + recv_msg;

    return msg.reply(text);
}

async function getTransactions (msg) {
    return new Promise(async (res) => {
        const user = await User.findOne({username: await msg.author.name }) || await await createNewUser(await msg.author.name);

        const options = {
            "data.userId": user._id
        };

        const withdraws_raw = await Job.find(options).limit(100).sort({ lastFinishedAt: 'desc' });
        const deposits_raw = await Job.find({ "data.username": user.username }).limit(100).sort({ lastFinishedAt: 'desc' });
        const data_w = withdraws_raw.map(row => row.toJSON());
        const data_d = deposits_raw.map(row => row.toJSON());

        const deposits = { txs: [] }; const withdraws = { pending: [], txs: [] };

        for (let tx of data_d) {
            deposits.txs.push(tx.data);
        }

        for (let tx of data_w) {
            if (tx.completed == 'true') {
                withdraws.txs.push(tx.data);
            } else {
                withdraws.pending.push(tx.data);
            }
        }

        res({ deposits, withdraws });

    });
}

async function transactions(msg) {

    const { deposits, withdraws } = await getTransactions(msg);

    let pend_msg = "**Pending transactions:**\n";

    let tx_msg = "\n**Completed transactions**:\n";

    for (let txd of deposits.txs) {

        tx_msg += `\nDeposit Amount: ${txd.rawAmount} PIVX | TXID: ${txd.txid}\n`;
    }

    for (let pend of withdraws.pending) {
        pend_msg += `\nWithdraw Amount: ${pend.amount} PIVX  | Pending\n`;
    }

    for (let txd of withdraws.txs) {

        tx_msg += `\nWithdraw Amount: ${txd.amount} PIVX | TXID: ${txd.txid}\n`;
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
