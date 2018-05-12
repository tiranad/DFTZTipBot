const mongoose = require('mongoose');

module.exports = async (options = {}) => {
    let dbName = "data_pivx_" + global.env;

    if (global.env === "development" && !options.silent) {
        mongoose.set('debug', true);
    }

    console.log(dbName);

    let mongoConnectionString = `mongodb://localhost:27017/${dbName}`;
    let db = await mongoose.connect(mongoConnectionString);

    return {
        db
    };
};
