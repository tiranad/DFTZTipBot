const path = require('path');

global.srcRoot = path.resolve(__dirname);
global.env = process.env.NODE_ENV ? process.env.NODE_ENV : "development";

const Snoowrap = require('snoowrap');
const snoostream = require('snoostream');
const config = require('./data/config.json');

const msgHandler = require('./handlers/handle_msg.js');

const setupDatabase = require('./db/setup');

const client = new Snoowrap({
    userAgent   : config.auth.USER_AGENT,
    clientId    : config.auth.CLIENT_ID,
    clientSecret: config.auth.CLIENT_SECRET,
    username    : config.auth.USERNAME,
    password    : config.auth.PASSWORD
});

const snooStream = snoostream(client);

const commentStream = snooStream.commentStream('PIVXTipTest', {regex: /([!tip])\w+/g});

commentStream.on('post', (post) => {
    msgHandler(post, client);
});

setupDatabase().then(() => {
    console.log(`PIVX Tip Bot starting up...`);
});
