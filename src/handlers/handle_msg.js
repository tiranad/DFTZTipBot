const handleTip = require('./handleTip.js');

const handleErr = require('./error_handler.js');

const Decimal = require('decimal.js');

module.exports = async (post, client) => {

    const {body} = post;
    //if (subreddits.indexOf(subreddit.display_name.toLowerCase()) === -1) return;
    const args = body.match(/\S+/g);

    if (args[0] !== '!pivxtip') return;

    if (args.length < 3) return;

    const _user = args[1];

    if (_user.slice(3) === await post.author.name) return post.reply('You may not tip yourself!');
    if (!_user.startsWith('/u/')) return post.reply('The username needs to be prefaced with /u/! Example: !pivxtip /u/DaJuukes 1');

    const user = client.getUser(_user.slice(3));

    const amount = args[2];
    if (isNaN(parseFloat(amount))) return;

    //const c = await client.getComment(parent_id);



    if (user) {
        //do stuff with comment
        console.log('Handling tip..');
        handleTip(post, { author: await user }, amount).then(async () => {
            await post.reply(`/u/${await post.author.name} has sucessfully tipped /u/${await user.name} ${toFixed(Decimal(amount).toString(), 3)} PIVX!`);
        }).catch(async (err) => {
            //insufficient funds
            await post.reply(err);
        });
    }
    else {
        //error
        handleErr("Unable to find comment from ID");
    }
};
