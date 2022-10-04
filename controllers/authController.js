const { StatusCodes } = require("http-status-codes");
const { BadRequestError, NotFoundError } = require("../errors");
const CustomAPIError = require("../errors/custom-api-error");
const CustomFormError = require("../errors/custom-form-error");
const User = require("../models/User");

// @route : POST /api/auth/register
// @desc : creating a new user
// reqBody : required

const register = async (req, res) => {
    const { profileImg, password, email, userName } = req.body;

    const user = await User.create({
        password: password.trim(),
        userName,
        email,
        profileImg,
    });
    const token = user.genToken();
    res.status(StatusCodes.CREATED).json({
        success: true,
        token,
        message: "Registered successfully",
    });
};

// @route : POST /api/auth/login
// @desc : logging in a user
// reqBody : required

const login = async (req, res) => {
    const { password, email } = req.body;

    let isValidationError = false;
    let errorsArr = [];
    let errorFields = [];

    if (password.length === 0) {
        isValidationError = true;
        errorsArr.push("Password must be provided");
        errorFields.push("password");
    }
    if (email.length === 0) {
        isValidationError = true;
        errorsArr.push("Email must be provided");
        errorFields.push("email");
    }

    if (isValidationError) {
        throw new CustomFormError({
            message: "Both email and password are required",
            errorFields,
            errorsArr,
        });
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw new NotFoundError("Invalid credentials");
    }
    const isPasswordCorrect = await user.compareHash(password);
    const token = user.genToken();

    if (isPasswordCorrect) {
        return res.status(StatusCodes.OK).json({
            success: true,
            token,
            message: "Logged In successfully",
        });
    }
    throw new BadRequestError("Invalid credentials");
};

module.exports = { login, register };
