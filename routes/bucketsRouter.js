const express = require("express");
const {
    createBucket,
    deleteBucket,
    updateBucket,
    getAllPublicBuckets,
    getBucket,
    getAllBucketsOfCurrentUser,
    getUsersWithAccess,
    gainAccessToBucket,
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

router.get("/public", getAllPublicBuckets); // accessible to everyone

// all the bucket resources below would require the user to be authorized
router.use(authenticateUser);

// 1 : only accessible to the user who is currently logged in / every user
// 2 : accessible to users with access , owner and correct password holders
router.get("/", getAllBucketsOfCurrentUser); // 1
router.get("/:bucketId", checkAccess, getBucket); // 2
router.get("/:bucketId/accessUsers", getUsersWithAccess); //1
router.post("/:bucketId/gainAccess", gainAccessToBucket); // 1
router.post("/", createBucket); // 1
router.delete("/:id", deleteBucket); // 1
router.patch("/:id", updateBucket); // 1

router.get("/:bucketId/items", checkAccess, getAllItems); // 2
router.get("/:bucketId/items/:itemId", checkAccess, getItem); // 2
router.post("/:bucketId/items", createItem); // 1
router.delete("/:bucketId/items", deleteItems); // 1
router.delete("/:bucketId/items/:itemId", deleteItem); // 1
router.patch("/:bucketId/items/:itemId", checkAccess, updateItem); // 1

router.post("/:bucketId/items/:itemId/comments", checkAccess, postComment); // 2
router.delete("/:bucketId/items/:itemId/comments/:commentId", deleteComment); // 1
router.patch("/:bucketId/items/:itemId/comments/:commentId", updateComment); // 1

module.exports = router;
