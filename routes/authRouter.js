const express = require("express");
const router = express.Router();
const {
    login,
    register,
    getUser,
    deleteUser,
    updateUser,
} = require("../controllers/authController");
const authenticateUser = require("../middlewares/authenticate");

router.post("/login", login);
router.post("/register", register);

router.use(authenticateUser);
router.get("/", getUser);
router.delete("/", deleteUser);
router.put("/", updateUser);

module.exports = router;
