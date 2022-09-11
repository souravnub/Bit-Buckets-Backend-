const bcrypt = require("bcryptjs");
module.exports = async function (str, hash) {
    const compareResult = await bcrypt.compare(str.trim(), hash);
    return compareResult;
};
