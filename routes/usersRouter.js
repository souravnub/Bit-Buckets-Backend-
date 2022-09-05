const express = require("express");
const {
    giveBucketAccessToAnotherUser,
    getUsers,
    removeBucketAccessFromUser,
    linkUser,
    unLinkUser,
} = require("../controllers/usersController");
const authenticateUser = require("../middlewares/authenticate");

const router = express.Router();

// base url : /api/users
router.get("/", getUsers);

// below are the request that requires user authentication
router.use(authenticateUser);

router.post(
    "/:userId/giveBucketAccess/:bucketId",
    giveBucketAccessToAnotherUser
);
router.post(
    "/:userId/removeBucketAccess/:bucketId",
    removeBucketAccessFromUser
);
router.post("/link/:userToLink", linkUser);
router.post("/unlink/:userToUnLink", unLinkUser);

module.exports = router;