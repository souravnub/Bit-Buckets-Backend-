const { StatusCodes } = require("http-status-codes");
const Items = require("../models/Item");

// @Authorization : true (for ALL requests)

// @route : GET /api/buckets/:bucketId/items
const getAllItems = async (req, res) => {
    const { bucketId } = req.params;

    const items = await Items.find({ bucket_id: bucketId, userId: req.userId });

    res.json({ success: true, items, nbHits: items.length });
};

// @route : GET /api/buckets/:bucketId/items/:itemId
const getItem = async (req, res) => {
    const { itemId, bucketId } = req.params;
    const userId = req.userId;

    const item = await Items.findOne({
        _id: itemId,
        userId,
        bucket_id: bucketId,
    });

    res.json({ success: true, item });
};

// @route : POST /api/buckets/:bucketId/items
const createItem = async (req, res) => {
    const { bucketId } = req.params;
    const userId = req.userId;

    const created_item = await Items.create({
        ...req.body,
        userId,
        bucket_id: bucketId,
    });

    res.status(StatusCodes.CREATED).json({ success: true, item: created_item });
};

module.exports = { getAllItems, getItem, createItem };
