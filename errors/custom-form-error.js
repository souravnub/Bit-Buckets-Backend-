const { StatusCodes } = require("http-status-codes");

class CustomFormError extends Error {
    constructor({ message, errorFields, errorsArr }) {
        super(message);
        this.errorFields = errorFields;
        this.errorsArr = errorsArr;
        this.statusCode = StatusCodes.BAD_REQUEST;
    }
}

module.exports = CustomFormError;
