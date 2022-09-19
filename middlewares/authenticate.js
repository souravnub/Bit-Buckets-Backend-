const jwt = require("jsonwebtoken");
const { UnauthorizedError } = require("../errors");
const User = require("../models/User");

const authenticateUser = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new UnauthorizedError("Not authorized to access this resource");
    }

    const token = authHeader.split(" ")[1];

    try {
        const { userId } = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = userId;
        next();
    } catch (err) {
        throw new UnauthorizedError("Not authorized to access the resource");
    }
};

module.exports = authenticateUser;
