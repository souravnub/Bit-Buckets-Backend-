module.exports = isStringPositiveInteger = (str) => {
    if (Number.parseInt(str) !== NaN && parseInt(str) > 0) {
        return true;
    }
    return false;
};
