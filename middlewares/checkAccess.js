const { StatusCodes } = require("http-status-codes");
const { NotFoundError } = require("../errors");
const Bucket = require("../models/Bucket");
const User = require("../models/User");

const checkAccess = async (req, res, next) => {
    const { bucketId } = req.params;
    const userId = req.userId;

    const userPromise = User.findById(userId);
    const bucketPromise = Bucket.findById(bucketId);

    const [{ value: user }, { value: bucket }] = await Promise.allSettled([
        userPromise,
        bucketPromise,
    ]);

    if (!bucket) {
        throw new NotFoundError("No such bucket found");
    }
    if (!user) {
        throw new NotFoundError(
            "No user found with the give userId to give access to"
        );
    }

    let isBucketAccessible = user.accessibleBuckets.find(
        (mongoId) => mongoId.toString() === bucketId
    );
    let isUserOwner = bucket.owner.toString() === userId;

    if (!(isBucketAccessible || isUserOwner)) {
        // if the user accessing the resource is a user that have access to the bucket , but is not the owner of the bucket

        res.status(StatusCodes.FORBIDDEN).json({
            success: false,
            message:
                "This resource is not accessible. You are neither the owner of the bucket nor a user having access to it,therefore gain access by providing the correct password for the bucket first and then try again",
        });
        return;
    }

    if (isBucketAccessible && !isUserOwner) {
        // the below prop will be used in updating the item .... the accessUser can only update the comments and isPurchased property of the item , not the whole item
        // but an owner can change whatsoever he wants (so as to differentiate between a owner and access user we are defining the property userWithAccessOnly)
        req.userWithAccessOnly = true;
    }
    next();
};

module.exports = checkAccess;
