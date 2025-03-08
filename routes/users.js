// routes/userRoutes.js
const express = require("express");
const { getAllUsers, searchUsersByUsername } = require("../controllers/userController");

const router = express.Router();

// 获取所有用户
router.get("/", getAllUsers);

// 根据关键字搜索用户
router.get("/search", searchUsersByUsername);

module.exports = router;
