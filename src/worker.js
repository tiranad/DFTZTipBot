const setupDatabase = require('./db/setup');

const Decimal = require('decimal.js');

const {User} = require('./db');

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
};

const duster = async () => {

    console.log('Sweeping dust...');

    const users = await User.find();

    for (let user of users) {
        const _newBal = User.getBigBalance(user);
        const newBal = Decimal(_newBal.toFixed(3)).div(1e-8);
        if (_newBal.toString() != newBal.toString()) {
            await User.findOneAndUpdate({_id: user._id}, {balance: newBal.toString() });
        }
    }

};

const startDelay = 2000; // ensure that server.js is up/running

console.log("Starting worker..");

setTimeout(() => {
    run();
    console.log('started');
}, startDelay);

setInterval(() => {
    duster();
}, 300000);

duster();
