const { StatusCodes } = require("http-status-codes");

const errorHandler = (err, req, res, next) => {
    return res
        .status(err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
        .json({
            success: false,
            message: err.message || "some internal server error occured...",
        });
};
module.exports = errorHandler;
