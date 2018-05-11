const Snoowrap = require('snoowrap');
const snoostream = require('snoostream');
const config = require('./data/config.json');

const msgHandler = require('./handlers/handle_msg.js');

const client = new Snoowrap({
    userAgent   : config.auth.USER_AGENT,
    clientId    : config.auth.CLIENT_ID,
    clientSecret: config.auth.CLIENT_SECRET,
    username    : config.auth.USERNAME,
    password    : config.auth.PASSWORD
});

const snooStream = snoostream(client);

const commentStream = snooStream.commentStream('PIVXTipTest', {regex: /([!pivxtip])\w+/g});

commentStream.on('post', (post) => {
    msgHandler(post, client);
});

console.log(`PIVX Tip Bot starting up...`);
