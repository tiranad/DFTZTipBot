module.exports = (snoowrap) => {

    console.log('init check');

    global.PIVXEvents.on('deposit_complete', async (data) => {

        console.log('d');

        const user = snoowrap.getUser(data.username);

        await user.reply(`You're deposit of ${data.amount} PIVX is complete. Your funds are available to use.`);
    });

    global.PIVXEvents.on('withdraw_complete', async (data) => {

        console.log('d');

        const user = snoowrap.getUser(data.username);

        await user.reply(`You're withdraw of ${data.amount} PIVX  to ${data.address} is complete. Your funds are available to use.`);
    });

};
