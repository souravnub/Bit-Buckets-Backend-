const { StatusCodes } = require("http-status-codes");
const { BadRequestError, NotFoundError } = require("../errors");
const User = require("../models/User");

// @route : POST /api/auth/register
// @desc : creating a new user
// reqBody : required

const register = async (req, res) => {
    const user = await User.create(req.body);
    const token = user.genToken();
    res.status(StatusCodes.CREATED).json({ success: true, token });
};

// @route : POST /api/auth/login
// @desc : logging in a user
// reqBody : required

const login = async (req, res) => {
    const { password, email } = req.body;

    if (password.length === 0 || email.length === 0) {
        throw new BadRequestError("both email and password should be provided");
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw new NotFoundError("no user exists with the provided email");
    }
    const isPasswordCorrect = await user.compareHash(password);
    const token = user.genToken();

    if (isPasswordCorrect) {
        return res.status(StatusCodes.OK).json({
            success: true,
            token,
            message: "logged In successfully",
        });
    }
    throw new BadRequestError("invalid credentials ... please try again");
};

module.exports = { login, register };
