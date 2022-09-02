const express = require("express");
const {
    createBucket,
    deleteBucket,
    updateBucket,
    getAllBuckets,
    getBucket,
} = require("../controllers/bucketsController");
const {
    getAllItems,
    getItem,
    createItem,
} = require("../controllers/itemsController");
const authenticateUser = require("../middlewares/authenticate");
const router = express.Router();

// all the bucket resources would require the user to be authorized
router.use(authenticateUser);

// base route : /api/bucket

router.get("/", getAllBuckets);
router.get("/:id", getBucket);
router.post("/", createBucket);
router.delete("/:id", deleteBucket);
router.patch("/:id", updateBucket);

router.get("/:bucketId/items", getAllItems);
router.get("/:bucketId/items/:itemId", getItem);
router.post("/:bucketId/items", createItem);

module.exports = router;
