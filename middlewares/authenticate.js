const jwt = require("jsonwebtoken");
const { UnauthorizedError, NotFoundError } = require("../errors");
const User = require("../models/User");

const authenticateUser = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new UnauthorizedError("not authorized to access this resource");
    }

    const token = authHeader.split(" ")[1];

    try {
        const { userId } = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = userId;
        next();
    } catch (err) {
        throw new UnauthorizedError("not authorized to access the resource");
    }
};

module.exports = authenticateUser;
