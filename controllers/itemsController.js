const { StatusCodes } = require("http-status-codes");
const { BadRequestError } = require("../errors");
const Bucket = require("../models/Bucket");
const Items = require("../models/Item");
const isObject = require("../utils/isObject");

// @Authorization : true (for ALL requests)

// @route : GET /api/buckets/:bucketId/items
// @desc : getting all items for a bucket
// @AccessCheck : true

const getAllItems = async (req, res) => {
    const { bucketId } = req.params;
    const { isPurchased, fields } = req.query;

    let items;

    items = Items.find({
        bucketId,
    });

    if (isPurchased === "true") {
        items = Items.find({
            bucketId,
            isPurchased: true,
        });
    }
    if (fields) {
        items = items.select(fields.split(",").join(" "));
    }

    items.sort("-createdAt");
    items = await items;

    res.json({ success: true, items, nbHits: items.length });
};

// @route : GET /api/buckets/:bucketId/items/:itemId
// @desc : getting a single item for a bucket
// @AccessCheck : true
const getItem = async (req, res) => {
    const { itemId, bucketId } = req.params;

    const item = await Items.findOne({
        _id: itemId,
        bucketId: bucketId,
    });

    res.json({ success: true, item });
};

// @route : POST /api/buckets/:bucketId/items
// @desc : creating an item for a bucket OR creating multiple items (should always be in an array)
// @reqBody : required (Arr of items(objects) that are to be created)
const createItem = async (req, res) => {
    const { bucketId } = req.params;
    const itemsArr = req.body;
    const userId = req.userId;

    const mainItemsArr = itemsArr.map((item) => {
        return { ...item, userId, bucketId };
    });

    const created_items = await Items.create(mainItemsArr);

    res.status(StatusCodes.CREATED).json({
        success: true,
        items: created_items,
        message: `${created_items.length} items created successfully`,
    });
};

// @route : DELETE /api/buckets/:bucketId/items/:itemId
// @desc : deleting an item from a bucket
const deleteItem = async (req, res) => {
    const { bucketId, itemId } = req.params;
    const userId = req.userId;

    const deleted_item = await Items.findOneAndDelete({
        _id: itemId,
        bucketId,
        userId,
    });

    if (!deleted_item) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "no item found to delete",
        });
    }

    res.json({ success: true, item: deleted_item });
};

// @route : DELETE /api/:bucketId/items
// @desc : deleting multiple items from a bucket
// reqBody : requierd (array of itemIds to be deleted)
const deleteItems = async (req, res) => {
    const { bucketId } = req.params;
    const userId = req.userId;
    const itemsToDelArr = req.body;

    if (itemsToDelArr.length === 0 || !Array.isArray(itemsToDelArr)) {
        throw new BadRequestError(
            "no items provided to delete or iterable is not valid , cannot perform the operation"
        );
    }

    let promise_arr = itemsToDelArr.map((itemId) =>
        Items.findOneAndDelete({ _id: itemId, bucketId, userId })
    );

    // Promise.allSettled return an array of objects ,,,, objects contain the status ,value and reason ,, promise status : fulfilled or rejected ,, if fulfilled -> value will be present  and if rejected reason will be present in the object
    let result = await Promise.allSettled(promise_arr);

    let number_of_deleted_items = 0;
    result.forEach((obj) => {
        if (obj.status === "fulfilled" && obj.value !== null) {
            number_of_deleted_items += 1;
        }
    });

    res.json({
        success: true,
        message:
            number_of_deleted_items === 0
                ? "No item was deleted"
                : `${number_of_deleted_items} items deleted successfully`,
    });
};

//@route : PATCH /api/buckets/:bucketId/items/:itemId
// @desc : update an item of a bucket
// reqBody : required
// @AccessCheck : true
const updateItem = async (req, res) => {
    const { bucketId, itemId } = req.params;
    const { userWithAccessOnly } = req;
    let changeToMake = req.body;

    if (!isObject(changeToMake)) {
        throw new BadRequestError(
            "invalid request Body provided (valid type : object)"
        );
    }

    // extraProps are the properties that an accessOnlyUser is trying to change
    // ex. the accessOnlyUsers are having the privilage to change two props only : isPurchased & comments. Say an accessOnlyUser is trying to change name of the item along with isPurchased and comments ... then name over here is the extra prop that he is trying to change and hence we should respond that this prop cannot be set by you...
    let extraProps = [];

    if (userWithAccessOnly) {
        extraProps = Object.keys(changeToMake).map((prop) => {
            if (prop !== "isPurchased" && prop !== "comments") {
                return prop;
            }
        });

        const { comments, isPurchased } = req.body;
        changeToMake = { comments, isPurchased };
    }

    const updated_item = await Items.findOneAndUpdate(
        { bucketId, _id: itemId },
        changeToMake,
        { new: true, runValidators: true }
    );

    if (!updated_item) {
        res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "no item found to update",
        });
    }

    res.json({
        success: true,
        item: updated_item,
        message: "item updated successfully",
    });
};

module.exports = {
    getAllItems,
    getItem,
    createItem,
    deleteItem,
    deleteItems,
    updateItem,
};
