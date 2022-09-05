const { StatusCodes } = require("http-status-codes");
const { NotFoundError, UnauthorizedError } = require("../errors");
const Bucket = require("../models/Bucket");
const User = require("../models/User");

// @Authorization : true(for ALL requests)

// @route : GET /api/buckets/
// @desc : get all buckets

const getAllBuckets = async (req, res) => {
    const { limit, sort, fields, title, bucketRef } = req.query;

    let buckets;

    // it is awaited afterwards...
    buckets = Bucket.find({ owner: req.userId });

    if (title || bucketRef) {
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

    buckets = await buckets;

    res.json({ success: true, buckets, nbHits: buckets.length });
};

// @route : GET /api/buckets/:id
// @desc : get a bucket
// @AccessCheck : true

const getBucket = async (req, res) => {
    const { bucketId } = req.params;

    const bucket = await Bucket.findOne({ _id: bucketId });

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

    // below code block is for giving the access of the bucket to linked users
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
            errArr.push(linkedUsers[idx]);
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

    if (!removed_bucket) {
        throw new NotFoundError("No bucket found to delete !");
    }

    const usersHavingAccessToBucket = await User.find({
        accessibleBuckets: id,
    });

    const deletingBucketPromiseArr = usersHavingAccessToBucket.map((user) => {
        return user.updateOne({ $pull: { accessibleBuckets: id } });
    });

    await Promise.allSettled(deletingBucketPromiseArr);

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

module.exports = {
    createBucket,
    deleteBucket,
    updateBucket,
    getAllBuckets,
    getBucket,
};
