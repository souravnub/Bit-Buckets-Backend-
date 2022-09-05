const express = require("express");
const {
    createBucket,
    deleteBucket,
    updateBucket,
    getAllBuckets,
    getBucket,
    giveBucketAccessToAnotherUser,
} = require("../controllers/bucketsController");
const {
    getAllItems,
    getItem,
    createItem,
    deleteItem,
    deleteItems,
    updateItem,
} = require("../controllers/itemsController");
const authenticateUser = require("../middlewares/authenticate");
const checkAccess = require("../middlewares/checkAccess");
const router = express.Router();

// all the bucket resources would require the user to be authorized
router.use(authenticateUser);

// checkAccess is a middleware that will handle the access of the users that are not the creators of the bucket but are given access the creator of the bucket

// base route : /api/buckets

router.get("/", getAllBuckets);
router.get("/:bucketId", checkAccess, getBucket);
router.post("/", createBucket);
router.delete("/:id", deleteBucket);
router.patch("/:id", updateBucket);

router.get("/:bucketId/items", checkAccess, getAllItems);
router.get("/:bucketId/items/:itemId", checkAccess, getItem);
router.post("/:bucketId/items", createItem);
router.delete("/:bucketId/items", deleteItems);
router.delete("/:bucketId/items/:itemId", deleteItem);
router.patch("/:bucketId/items/:itemId", checkAccess, updateItem);

module.exports = router;
