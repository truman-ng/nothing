// routes/authRoutes.js
const express = require("express");
const { register, login } = require("../controllers/authController");

const router = express.Router();

// 注册
router.post("/register", register);

// 登录
router.post("/login", login);

module.exports = router;
