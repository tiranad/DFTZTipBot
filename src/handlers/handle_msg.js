const handleTip = require('./handleTip.js');

const handleErr = require('./error_handler.js');

const Decimal = require('decimal.js');

module.exports = async (post, client) => {

    const {parent_id, body} = post;
    //if (subreddits.indexOf(subreddit.display_name.toLowerCase()) === -1) return;
    const args = body.match(/\S+/g);

    if (args[0] !== '!pivxtip') return;

    if (args.length < 3) return;

    const _user = args[1];
    if (!_user.startsWith('/u/')) return post.reply('The username needs to be prefaced with /u/! Example: !pivxtip /u/DaJuukes 1');

    const user = client.getUser(_user.slice(3));

    const amount = args[2];
    if (isNaN(parseFloat(amount))) return;

    //const c = await client.getComment(parent_id);

    const authorName = await user.name;

    if (user) {
        //do stuff with comment
        console.log('Handling tip..');
        handleTip(post, { author: await user }, amount).then(async () => {
            await post.reply(`/u/${await post.author.name} has sucessfully tipped /u/${authorName} ${toFixed(Decimal(amount).toString(), 3)} PIVX!`);
        }).catch(async (err) => {
            //insufficient funds
            if (err == 1) await post.reply(`Insufficient funds to tip ${authorName} ${amount} PIVX!`);
            else if (err == 2) await post.reply(`You may not tip yourself!`);
            else if (err == 3) await post.reply(`The minimum amount allowed to tip is 0.001 PIVX.`);
            else if (err == 4) await post.reply(`You didn't have an account, so one was created for you!`);
            else await post.reply(err);
        });
    }
    else {
        //error
        handleErr("Unable to find comment from ID");
    }
};
