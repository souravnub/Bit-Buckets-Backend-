const bcrypt = require("bcryptjs");
module.exports = async function (str) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(str.trim(), salt);
    return hash;
};
