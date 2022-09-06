const express = require("express");
const {
    createBucket,
    deleteBucket,
    updateBucket,
    getAllPublicBuckets,
    getBucket,
    getAllBucketsOfCurrentUser,
    getUsersWithAccess,
} = require("../controllers/bucketsController");
const {
    getAllItems,
    getItem,
    createItem,
    deleteItem,
    deleteItems,
    updateItem,
    postComment,
    deleteComment,
    updateComment,
} = require("../controllers/itemsController");
const authenticateUser = require("../middlewares/authenticate");
const checkAccess = require("../middlewares/checkAccess");
const router = express.Router();

// base route : /api/buckets
// checkAccess is a middleware that will handle the access of the users that are not the creators of the bucket but are given access the creator of the bucket

router.get("/public", getAllPublicBuckets);

// all the bucket resources below would require the user to be authorized
router.use(authenticateUser);

router.get("/", getAllBucketsOfCurrentUser);
router.get("/:bucketId", checkAccess, getBucket);
router.get("/:bucketId/accessUsers", getUsersWithAccess);
router.post("/", createBucket);
router.delete("/:id", deleteBucket);
router.patch("/:id", updateBucket);

router.get("/:bucketId/items", checkAccess, getAllItems);
router.get("/:bucketId/items/:itemId", checkAccess, getItem);
router.post("/:bucketId/items", createItem);
router.delete("/:bucketId/items", deleteItems);
router.delete("/:bucketId/items/:itemId", deleteItem);
router.patch("/:bucketId/items/:itemId", checkAccess, updateItem);

router.post("/:bucketId/items/:itemId/comments", checkAccess, postComment);
router.delete("/:bucketId/items/:itemId/comments/:commentId", deleteComment);
router.patch("/:bucketId/items/:itemId/comments/:commentId", updateComment);

module.exports = router;
