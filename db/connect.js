const mongoose = require("mongoose");

const connectToDB = (mongoURI) => {
    return mongoose.connect(mongoURI);
};

module.exports = connectToDB;
