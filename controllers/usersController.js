const {
    NotFoundError,
    BadRequestError,
    UnauthorizedError,
} = require("../errors");
const Bucket = require("../models/Bucket");
const User = require("../models/User");
const compareBcryptHash = require("../utils/compareBcryptHash");
const genHash = require("../utils/genHash");
const isStringPositiveInteger = require("../utils/isStringPositiveInteger");

// @route : DELETE /api/users
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

// @route : GET /api/users/me
// @desc : getting the current user ,, , (pass the authentication and get yourself)
const getUser = async (req, res) => {
    const userId = req.userId;

    const user = await User.findById(userId).select("-password");

    if (!user) {
        throw new NotFoundError("User not found");
    }

    res.json({ success: true, user });
};

// @route : PUT /api/users/me
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

    res.json({ success: true, updatedUser });
};

// @route : GET /api/users/:userId/buckets
// @desc : get all the buckets of a user that are public
const getUserPublicBuckets = async (req, res) => {
    const { limit, sort, title, bucketRef } = req.query;

    let buckets;

    // it is awaited afterwards...
    buckets = Bucket.find({ owner: req.params.userId, private: false });

    if (title || bucketRef) {
        let searchObj = { owner: req.params.userId, private: false };
        if (title) {
            searchObj = {
                ...searchObj,
                title: { $regex: title.trim(), $options: "i" },
            };
        }
        if (bucketRef) {
            searchObj = { ...searchObj, bucketRef };
        }
        buckets = Bucket.find(searchObj);
    }

    if (limit) {
        buckets = buckets.limit(limit);
    }
    if (sort) {
        const sortStr = sort.split(",").join(" ");
        buckets = buckets.sort(sortStr);
    } else {
        // if sort option is not provided then sort by createAt in desc order
        buckets = buckets.sort("-createdAt");
    }

    buckets = await buckets.select("-password");

    res.json({ success: true, buckets, nbHits: buckets.length });
};

// @route : POST /api/users/:userId/giveBucketAccess/:bucketId
// @desc : give bucket access to another user
// @Authorization : true
const giveBucketAccessToAnotherUser = async (req, res) => {
    const { bucketId, userId: userToBeGivenAccess } = req.params;
    const owner = req.userId;
    const bucket = await Bucket.findOne({ _id: bucketId, owner });
    if (!bucket) {
        throw new NotFoundError("No such bucket found under your ownership");
    }

    const user = await User.findOne({ _id: userToBeGivenAccess });

    if (!user) {
        throw new NotFoundError("User to be given access to not found");
    }

    if (bucket.owner.toString() === userToBeGivenAccess) {
        throw new BadRequestError(
            "You are the owner of the bucket and hence having the access"
        );
    }

    if (user.accessibleBuckets.includes(bucketId)) {
        throw new BadRequestError(
            `${user.userName} is already having access to the bucket , therefore cannot provide access again`
        );
    }

    await user.updateOne({ $push: { accessibleBuckets: bucketId } });

    res.json({
        success: true,
        message: `Access of the bucket given successfully to ${user.userName}`,
    });
};

// @route : POST /api/users/:userId/removeBucketAccess/:bucketId
// @desc : removing a user from having access to a bucket
// @Authorization : true
const removeBucketAccessFromUser = async (req, res) => {
    const { userId: userToRemoveAccessFrom, bucketId } = req.params;
    const owner = req.userId;

    const bucket = await Bucket.findOne({ _id: bucketId, owner });

    if (!bucket) {
        throw new NotFoundError("No such bucket found under your ownership");
    }

    const user = await User.findById(userToRemoveAccessFrom);

    if (!user) {
        throw new NotFoundError("User to be removed access from not found");
    }

    if (bucket.owner.toString() === userToRemoveAccessFrom) {
        throw new BadRequestError(
            "You are the owner of the bucket and hence access cannot be removed. Alternative : delete bucket"
        );
    }

    if (!user.accessibleBuckets.includes(bucket._id)) {
        throw new BadRequestError(
            `${user.userName} is not having access to the bucket already ... therefore cannot perform the operation`
        );
    }
    await user.updateOne({ $pull: { accessibleBuckets: bucketId } });

    res.json({
        success: true,
        message: `Access of bucket removed successfully from ${user.userName}`,
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
            "We are having  trouble while finding you... please login / register and try again"
        );
    }
    if (!userToBeLinked) {
        throw new NotFoundError(
            "The user to be linked is not found ... please make sure that the credentials of the user are valid"
        );
    }
    if (userToBeLinked._id.toString() === currentUser._id.toString()) {
        throw new BadRequestError(
            "You are trying to link yourself with you! that cannot be done"
        );
    }
    // if user is currently linked , then cannot link it again...
    let isUserCurrentlyLinked = currentUser.linkedUsers.find(
        (userMongoId) => userMongoId.toString() === userToLink
    );
    if (isUserCurrentlyLinked) {
        throw new BadRequestError(
            `${userToBeLinked.userName} is already linked with you, cannot link again`
        );
    }

    await currentUser.updateOne({ $push: { linkedUsers: userToLink } });

    res.json({
        success: true,
        message: `${userToBeLinked.userName} linked successfully`,
    });
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
            "We are having  trouble while finding you... please login / register and try again"
        );
    }

    if (!userToBeUnLinked) {
        throw new NotFoundError(
            "Cannot unlink the user, as it is not currently linked"
        );
    }

    await currentUser.updateOne({ $pull: { linkedUsers: userToUnLink } });

    res.json({ success: true, message: "User unlinked successfully" });
};

module.exports = {
    getUsers,
    getUser,
    getUserPublicBuckets,
    giveBucketAccessToAnotherUser,
    removeBucketAccessFromUser,
    linkUser,
    unLinkUser,
    deleteUser,
    updateUser,
};
