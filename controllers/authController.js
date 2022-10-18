const { StatusCodes } = require("http-status-codes");
const {
    BadRequestError,
    NotFoundError,
    UnauthorizedError,
} = require("../errors");
const CustomFormError = require("../errors/custom-form-error");
const User = require("../models/User");
const compareBcryptHash = require("../utils/compareBcryptHash");

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

    if (!password) {
        isValidationError = true;
        errorsArr.push("Password must be provided");
        errorFields.push("password");
    }
    if (!email) {
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

// @route : GET /api/auth
// @desc : getting the current user ,, , (pass the authentication and get yourself. Authentication token is passed therefore the user will be verified ,, hence we can send password string in the response as well as we know that the user is authorized)
const getUser = async (req, res) => {
    const userId = req.userId;

    const user = await User.findById(userId);

    if (!user) {
        throw new NotFoundError("User not found");
    }

    res.json({ success: true, user });
};

// @route : DELETE /api/auth/
// @desc : delete a user
// reqHeaders : password (password of the current user)

const deleteUser = async (req, res) => {
    const userId = req.userId;
    const { password } = req.headers;

    if (!password.trim()) {
        throw new BadRequestError(
            "Providing password while deleting a user is must"
        );
    }

    const user = await User.findById(userId);

    if (!user) {
        throw new NotFoundError("No user found");
    }

    const isPasswordCorrect = await compareBcryptHash(
        password.trim(),
        user.password
    );

    if (!isPasswordCorrect) {
        throw new UnauthorizedError("Invalid credentials cannot delete user");
    }

    await user.delete();
    //remove links of the current user from other users (not doing it in the middleware because a user can only be deleted from one route only and there is no other method to delete a user .... as in Buckets  , , a bucket can be deleted directly manually and also if a user is deleted then the buckets are deleted hence we have two methods to delete a bucket therefore so as to not repeat the code we used a middleware ... but a user cannot be deleted by such a side-effect therefore is not using any middleware)
    const linked_with = await User.updateMany(
        { linkedUsers: user._id },
        { $pull: { linkedUsers: user._id } }
    );
    console.log(linked_with);

    res.json({ success: true, message: "User deleted successfully" });
};

// @route : PUT /api/auth
// @desc : updating current user's data

const updateUser = async (req, res) => {
    const userId = req.userId;
    const { password, profileImg, userName, email } = req.body;

    let updatedUserObj = {};

    if (password) {
        updatedUserObj.password = await genHash(password);
    }
    if (profileImg) {
        updatedUserObj.profileImg = profileImg;
    }
    if (userName) {
        updatedUserObj.userName = userName;
    }
    if (email) {
        updatedUserObj.email = email;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updatedUserObj, {
        new: true,
        runValidators: true,
    });

    if (!updatedUser) {
        throw new NotFoundError("User not found");
    }

    res.json({
        success: true,
        message: "User updated successfully",
        user: updatedUser,
    });
};

module.exports = { login, register, deleteUser, getUser, updateUser };
