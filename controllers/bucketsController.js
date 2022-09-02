const { NotFoundError } = require("../errors");
const Bucket = require("../models/Bucket");

// @Authorization : true(for ALL requests)

// @route : GET /api/buckets/
// @desc : get all buckets

const getAllBuckets = async (req, res) => {
    const { limit, sort, fields, title, bucket_ref } = req.query;

    let buckets;

    // it is awaited afterwards...
    buckets = Bucket.find({ userId: req.userId });

    if (title || bucket_ref) {
        let searchObj = {};
        if (title) {
            searchObj = { title: { $regex: title.trim(), $options: "i" } };
        }
        if (bucket_ref) {
            searchObj = { ...searchObj, bucket_ref };
        }
        buckets = Bucket.find(searchObj);
    }

    if (limit) {
        buckets = buckets.limit(limit);
    }
    if (sort) {
        const sortStr = sort.split(",").join(" ");
        buckets = buckets.sort(sortStr);
    }
    if (fields) {
        const required_fields = fields.split(",").join(" ");
        buckets = buckets.select(required_fields);
    }

    buckets = await buckets;

    res.json({ success: true, buckets, nbHits: buckets.length });
};

// @route : GET /api/buckets/:id
// @desc : get a buckets

const getBucket = async (req, res) => {
    const { id } = req.params;
    const buckets = await Bucket.find({ _id: id, userId: req.userId });
    res.json({ success: true, buckets, nbHits: buckets.length });
};

// @route : POST /api/buckets/
// @desc : create a bucket
//  reqBody : required

const createBucket = async (req, res) => {
    const created_bucket = await Bucket.create({
        created_by: req.userId,
        ...req.body,
    });
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
        created_by: req.userId,
    });

    if (!removed_bucket) {
        throw new NotFoundError("No bucket found to delete !");
    }

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
        { _id: id, created_by: req.userId },
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
