// routes/UserRoutes.js
const express = require("express");
const UserController = require("../controllers/UserController");

const router = express.Router();

// 注册
router.post("/register", UserController.register);

// 登录
router.post("/login", UserController.login);

// 其他接口(如获取用户信息)...

module.exports = router;
