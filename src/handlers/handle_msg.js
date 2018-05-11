const handleErr = require('./error_handler.js');

module.exports = async (post, client) => {
    if (!post.body.startsWith('!pivxtip')) return;
    const {parent_id, body} = post;
    const args = body.match(/\S+/g);

    if (args.length < 2) return;

    const amount = parseInt(args[1]);
    if (isNaN(amount)) return;

    const c = await client.getComment(parent_id);

    if (c) {
        //do stuff with comment
    }
    else {
        //error
        handleErr("Unable to find comment from ID");
    }
};
