const { StatusCodes } = require("http-status-codes");
const {
    NotFoundError,
    UnauthorizedError,
    BadRequestError,
} = require("../errors");
const Bucket = require("../models/Bucket");
const User = require("../models/User");
const genHash = require("../utils/genHash");

// @route : GET /api/buckets/public
// @desc : get all buckets

const getAllPublicBuckets = async (req, res) => {
    const { limit, sort, fields, title, bucketRef } = req.query;

    let buckets;

    // it is awaited afterwards...
    buckets = Bucket.find({ private: false });

    if (title || bucketRef) {
        let searchObj = { private: false };
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
    if (fields) {
        const required_fields = fields.split(",").join(" ");
        buckets = buckets.select(required_fields);
    }

    buckets = await buckets.select("-password");

    res.json({ success: true, buckets, nbHits: buckets.length });
};
// @Authorization : true(for ALL requests below)

//@route : GET /api/buckets
// @desc : get all the buckets for the user who is asking for .... (both private and public buckets)
const getAllBucketsOfCurrentUser = async (req, res) => {
    const { limit, sort, fields, title, bucketRef, private } = req.query;

    let buckets;

    // it is awaited afterwards...
    buckets = Bucket.find({ owner: req.userId });

    if (title || bucketRef || private) {
        let searchObj = { owner: req.userId };
        if (title) {
            searchObj = {
                ...searchObj,
                title: { $regex: title.trim(), $options: "i" },
            };
        }
        if (bucketRef) {
            searchObj = { ...searchObj, bucketRef };
        }
        if (private) {
            if (private === "true") {
                searchObj = { ...searchObj, private: true };
            } else {
                searchObj = { ...searchObj, private: false };
            }
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
    if (fields) {
        const required_fields = fields.split(",").join(" ");
        buckets = buckets.select(required_fields);
    }

    buckets = await buckets.select("-password");

    res.json({ success: true, buckets, nbHits: buckets.length });
};

// @route : GET /api/buckets/:id
// @desc : get a bucket
// @AccessCheck : true
// reqHeader (bucketpass) : requierd {if the user is not having access to bucket or if he is not the owner of the bucket}

const getBucket = async (req, res) => {
    const { bucketId } = req.params;

    const bucket = await Bucket.findOne({ _id: bucketId }).select("-password");

    if (!bucket) {
        res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "no bucket found with the given ID",
        });
    }

    return res.json({ success: true, bucket });
};

// @route : POST /api/buckets/
// @desc : create a bucket
//  reqBody : required

const createBucket = async (req, res) => {
    const created_bucket = await Bucket.create({
        owner: req.userId,
        ...req.body,
    });

    // *** below code block is for giving the access of the bucket to linked users ***
    // if i would have used this in post save middleware of the mongoose then I might not have a chance to tell the owner about the users that were denied access to the bucket due to some error ... (not completely sure!!!)
    const user = await User.findById(req.userId);
    const linkedUsers = user.linkedUsers;

    const linkedUserPromiseArr = linkedUsers.map((userId) => {
        let user = userId.toString();
        return User.updateOne(
            { _id: user },
            { $push: { accessibleBuckets: created_bucket._id } }
        );
    });

    const linkedUserAccessRes = await Promise.allSettled(linkedUserPromiseArr);

    // err Arr will contain the ids of the users which got some rejection while giving access ...

    let errArr = linkedUserAccessRes.filter((resObj, idx) => {
        if (resObj.status === "rejected") {
            return linkedUsers[idx];
        }
    });

    if (errArr.length !== 0) {
        return res.status(StatusCodes.MULTI_STATUS).json({
            success: false,
            // message : bucket had been created successfully , but  2 out of 10 users were denied access to it due to some error
            message: `bucket had been created successfully , but ${
                errArr.length
            } out of ${linkedUsers.length} ${
                linkedUsers.length > 1 ? "user" : "users"
            } were denied access to it due to some error`,
            access_rejected_to: errArr,
        });
    }

    res.json({
        success: true,
        bucket: created_bucket,
        message: "Bucket created successfully",
    });
};

// @route : DELETE /api/buckets/:id
// @desc : delete a bucket

const deleteBucket = async (req, res) => {
    const { id } = req.params;

    const removed_bucket = await Bucket.findOneAndDelete({
        _id: id,
        owner: req.userId,
    });

    res.json({
        success: true,
        bucket: removed_bucket,
        message: "bucket removed successfully",
    });
};

// @route : PATCH  /api/buckets/:id
// @desc : update a bucket
// reqBody : required
const updateBucket = async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    if (password) {
        let password_hash = await genHash(password);
        req.body = { ...req.body, password: password_hash };
    }

    const updated_bucket = await Bucket.findOneAndUpdate(
        { _id: id, owner: req.userId },
        req.body,
        { new: true, runValidators: true }
    );

    if (!updated_bucket) {
        throw new NotFoundError("No bucket found to update !");
    }

    res.json({
        success: true,
        bucket: updated_bucket,
        message: "bucket updated successfully",
    });
};

// @route : POST /api/buckets/:bucketId/gainAccess
// @desc : an unknown user can gain the access to a bucket using this route by providing the correct password
// reqHeaders : a bucket password (bucketpass) is requierd

const gainAccessToBucket = async (req, res) => {
    const { bucketId } = req.params;
    const userId = req.userId;
    const { bucketpass: bucketPass } = req.headers;

    const bucketPromise = Bucket.findById(bucketId);
    const userPromise = User.findById(userId);

    const [{ value: bucket }, { value: user }] = await Promise.allSettled([
        bucketPromise,
        userPromise,
    ]);

    if (!bucket) {
        throw new NotFoundError("bucket not found");
    }
    if (!user) {
        throw new NotFoundError("user not found");
    }

    const is_already_having_access = user.accessibleBuckets.find(
        (mongoId) => mongoId.toString() === bucketId
    );
    if (is_already_having_access) {
        throw new BadRequestError(
            "You already have access to bucket ,cannot provide access multiple times ! "
        );
    }
    if (bucket.owner.toString() === userId) {
        throw new BadRequestError(
            "you are already owner of the bucket, therefore bucket is already accessible"
        );
    }
    if (!bucketPass) {
        throw new BadRequestError(
            "a bucket password is must in request headers to gain access to it"
        );
    }

    let isBucketPasswordCorrect = await bucket.compareHash(bucketPass);
    if (!isBucketPasswordCorrect) {
        return res.json({
            success: false,
            message: "bucket access denied due to invalid password",
        });
    }
    // if user entered the correct pass then give him the access to the bucket -> this will allow him to access the bucket in future without entering the pass
    await user.updateOne({
        $push: { accessibleBuckets: bucketId },
    });
    res.json({
        success: true,
        message: "bucket access gained successfully",
    });
};

// @route : GET /api/buckets/:bucketId/accessUsers
// @desc : get all linked users to a bucket
const getUsersWithAccess = async (req, res) => {
    const { bucketId } = req.params;
    const userId = req.userId;

    const bucket = await Bucket.findOne({ _id: bucketId });
    if (!bucket) {
        throw new NotFoundError("bucket not found");
    }
    if (!(bucket.owner.toString() === userId)) {
        throw new UnauthorizedError("not authorized to access this bucket");
    }

    const usersWithAccess = await User.find({
        accessibleBuckets: bucketId,
    }).select("-password -accessibleBuckets -linkedUsers");

    res.json({ success: true, usersWithAccess });
};

module.exports = {
    createBucket,
    deleteBucket,
    updateBucket,
    getAllPublicBuckets,
    getBucket,
    getAllBucketsOfCurrentUser,
    getUsersWithAccess,
    gainAccessToBucket,
};
