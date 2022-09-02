const port = process.env.PORT || 5000;
const { StatusCodes } = require("http-status-codes");

const notFound = (req, res, next) => {
    res.status(StatusCodes.NOT_FOUND).send(
        `<h1>Route not found</h1>
        <a href=${
            process.env.PORT || `http://localhost:${port}`
        }>back to home</a>
        
        `
    );
};
module.exports = notFound;
