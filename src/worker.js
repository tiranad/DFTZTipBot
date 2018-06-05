const setupDatabase = require('./db/setup');
const PIVXevents = require('./events');

const config = JSON.parse(process.argv[2]);

const Snoowrap = require('snoowrap');

const client = new Snoowrap({
    userAgent   : config.userAgent,
    clientId    : config.clientId,
    clientSecret: config.clientSecret,
    username    : config.username,
    password    : config.password
});

global.PIVXEvents = PIVXevents;
global.env = process.env.NODE_ENV ? process.env.NODE_ENV : "development";

console.log("=== Starting WORKER ===");


const run = () => {
    setupDatabase({ silent: true }).then((result) => {
        let agenda = result.agenda;

        const paymentProcessor = require('./jobs/payment.js')(agenda);
        paymentProcessor.checkDeposit({ repeat: true });

        agenda.on('ready', function() {
            console.log('Agenda ready!');
            agenda.start();
        });

        agenda.on('fail', function(err, job) {
            job.attrs.stacktrace = err.stack;
            job.save();
            console.log('Job failed with error: %s', err.message);
        });

        agenda.on('success', function(job) {
            job.attrs.completed = true;
            job.save();

            if (job.attrs.name === "deposit_order") {
                console.log('deposit');
            }

            console.log('Job completed %s', job.attrs._id);
        });

    }).catch((err) => {
        console.error(err);
        process.exit(-1);
    });

    require('./handlers/check_jobs')(client);
};

const startDelay = 2000; // ensure that server.js is up/running

console.log("Starting worker..");

setTimeout(() => {
    run();
    console.log('started');
}, startDelay);
