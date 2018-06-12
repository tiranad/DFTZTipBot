const handleTip = require('./handleTip.js');

const Decimal = require('decimal.js');

const handleErr = require('./error_handler.js');

const text = `/u/replace1 sucessfully tipped replace2 PIVX to /u/replace3 !\n\n`
+ ``;



module.exports = async (post, client) => {
    if (!post.body.startsWith('!pivxtip ')) return;
    const {parent_id, body} = post;
    const args = body.match(/\S+/g);

    if (args.length < 2) return;

    const amount = Decimal(args[1]).toNumber();
    if (isNaN(amount)) return;

    const c = await client.getComment(parent_id);

    const authorName = await c.author.name;

    const map = {
        replace1: await post.author.name,
        replace2: amount,
        replace3: authorName
    };

    if (c) {
        //do stuff with comment
        handleTip(post, c, amount).then(async () => {
            let str = text.replace(/replace1|replace2|replace3/gi, (val) => map[val]);
            await post.reply(str);
        }).catch(async (err) => {
            //insufficient funds
            if (err == 1) await post.reply(`Insufficient funds to tip ${authorName} ${amount} PIVX!`);
            else if (err == 2) await post.reply(`You may not tip yourself!`);
            else if (err == 3) await post.reply(`Too small amount to tip!`);
        });
    }
    else {
        //error
        handleErr("Unable to find comment from ID");
    }
};
