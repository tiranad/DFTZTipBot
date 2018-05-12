const handleTip = require('./handleTip.js');

const handleErr = require('./error_handler.js');

module.exports = async (post, client) => {
    if (!post.body.startsWith('!tip ')) return;
    const {parent_id, body} = post;
    const args = body.match(/\S+/g);

    if (args.length < 2) return;

    const amount = parseInt(args[1]);
    if (isNaN(amount)) return;

    const c = await client.getComment(parent_id);

    const authorName = await c.author.name;

    if (c) {
        //do stuff with comment
        handleTip(post, c, amount).then(() => {
            return post.reply(`Successfully tipped ${authorName} ${amount} PIVX!`);
        }).catch(() => {
            //insufficient funds
            return post.reply(`Insufficient funds to tip ${authorName} ${amount} PIVX!`);
        });

    }
    else {
        //error
        handleErr("Unable to find comment from ID");
    }
};
