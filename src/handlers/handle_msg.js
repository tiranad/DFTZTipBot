const handleTip = require('./handleTip.js');

const handleErr = require('./error_handler.js');

const Decimal = require('decimal.js');

module.exports = async (post, client) => {

    const {body, parent_id} = await post;

    const args = body.match(/\S+/g);

    if (args[0] !== '/u/pivxtipbot') return;

    if (args.length < 2) return;

    const user = await client.getComment(parent_id)

    const amount = args[1];
    if (isNaN(parseFloat(amount))) return;

    //const c = await client.getComment(parent_id);



    if (user) {
        //do stuff with comment
        console.log('Handling tip..');
        handleTip(post, user, amount).then(async () => {
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
