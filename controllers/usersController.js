const { StatusCodes } = require("http-status-codes");
const { NotFoundError, BadRequestError } = require("../errors");
const Bucket = require("../models/Bucket");
const User = require("../models/User");
const isStringPositiveInteger = require("../utils/isStringPositiveInteger");

// @route : GET /api/users
// @desc : get all users
const getUsers = async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    let users = User.find({}).select("userName profileImg userRef");

    if (isStringPositiveInteger(limit)) {
        users = users.limit(limit);
    } else {
        users = users.limit(DEFAULT_LIMIT);
    }
    if (isStringPositiveInteger(limit) && isStringPositiveInteger(page)) {
        users = users.skip((parseInt(page) - 1) * parseInt(limit));
    } else {
        page = DEFAULT_PAGE;
        users = users.skip(0);
    }

    users = await users;

    res.json({ success: true, users, nbHits: users.length, page });
};

// @route : POST /api/users/:userId/giveBucketAccess/:bucketId
// @desc : give bucket access to another user
// @Authorization : true
const giveBucketAccessToAnotherUser = async (req, res) => {
    const { bucketId, userId: userToBeGivenAccess } = req.params;
    const owner = req.userId;
    const bucket = await Bucket.findOne({ _id: bucketId, owner });
    if (!bucket) {
        throw new NotFoundError(
            "you are not authorized to provide other users access to this bucket"
        );
    }

    const user = await User.findOne({ _id: userToBeGivenAccess });

    if (!user) {
        throw new NotFoundError("user to be given access to not found");
    }

    if (bucket.owner.toString() === userToBeGivenAccess) {
        throw new BadRequestError(
            "you are the owner of the bucket and hence having the access"
        );
    }

    if (user.accessibleBuckets.includes(bucketId)) {
        return res.status(StatusCodes.CONFLICT).json({
            success: false,
            message: "user is already having access to this bucket",
        });
    }

    await user.updateOne({ $push: { accessibleBuckets: bucketId } });

    res.json({ success: true, message: "access given successfully" });
};

// @route : POST /api/users/:userId/removeBucketAccess/:bucketId
// @desc : removing a user from having access to a bucket
// @Authorization : true
const removeBucketAccessFromUser = async (req, res) => {
    const { userId: userToRemoveAccessFrom, bucketId } = req.params;
    const owner = req.userId;

    const bucket = await Bucket.findOne({ _id: bucketId, owner });

    if (!bucket) {
        throw new NotFoundError("bucket not found");
    }

    const user = await User.findById(userToRemoveAccessFrom);

    if (!user) {
        throw new NotFoundError("user to be given access not found");
    }

    if (bucket.owner.toString() === userToRemoveAccessFrom) {
        throw new BadRequestError(
            "you are the owner of the bucket and hence access cannot be removed. Alternative : delete bucket"
        );
    }

    await user.updateOne({ $pull: { accessibleBuckets: bucketId } });

    res.json({
        success: true,
        message: "access from user removed successfully",
    });
};

// @route : POST /api/users/link/:userToLink
// @desc : link a user to current user
// @Authorization : true

const linkUser = async (req, res) => {
    const { userToLink } = req.params;
    const userId = req.userId;

    const currentUserPromise = User.findById(userId);
    const userToBeLinkedPromise = User.findById(userToLink);

    const [{ value: currentUser }, { value: userToBeLinked }] =
        await Promise.allSettled([currentUserPromise, userToBeLinkedPromise]);

    if (!currentUser) {
        throw new NotFoundError(
            "we are having  trouble while finding you... please login / register and try again"
        );
    }
    if (!userToBeLinked) {
        throw new NotFoundError(
            "the user to be linked is not found ... please make sure that the credentials of the user are valid"
        );
    } else {
        // if user is currently linked , then cannot link it again...
        let isUserCurrentlyLinked = currentUser.linkedUsers.find(
            (userMongoId) => userMongoId.toString() === userToLink
        );
        if (isUserCurrentlyLinked) {
            throw new BadRequestError(
                "user is already linked , cannot link again"
            );
        }
    }

    await currentUser.updateOne({ $push: { linkedUsers: userToLink } });

    res.json({ success: true, message: "user linked successfully" });
};

// @route : POST /api/users/unlink/:userToUnLink
// @desc : unLink a user from current user
// @Authorization : true
const unLinkUser = async (req, res) => {
    const { userToUnLink } = req.params;
    const userId = req.userId;

    const currentUserPromise = User.findById(userId);
    const userToBeUnLinkedPromise = User.findById(userToUnLink);

    const [{ value: currentUser }, { value: userToBeUnLinked }] =
        await Promise.allSettled([currentUserPromise, userToBeUnLinkedPromise]);

    if (!currentUser) {
        throw new NotFoundError(
            "we are having  trouble while finding you... please login / register and try again"
        );
    }

    if (!userToBeUnLinked) {
        throw new NotFoundError(
            "cannot unlink the user, as it is not currently linked"
        );
    }

    await currentUser.updateOne({ $pull: { linkedUsers: userToUnLink } });

    res.json({ success: true, message: "user unlinked successfully" });
};

module.exports = {
    getUsers,
    giveBucketAccessToAnotherUser,
    removeBucketAccessFromUser,
    linkUser,
    unLinkUser,
};
