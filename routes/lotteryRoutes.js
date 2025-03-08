// routes/lotteryRoutes.js
const express = require("express");
const {
    createLottery,
    getLottery,
    enterLottery,
    getWinners,
    getLotteryList,
} = require("../controllers/lotteryController");

const router = express.Router();

// 抽奖列表
router.get("/list", getLotteryList);

// 新建抽奖
router.post("/create", createLottery);

// 获取抽奖详情
router.get("/:lotteryId", getLottery);

// 用户报名
router.post("/:lotteryId/enter", enterLottery);

// 查看中奖列表
router.get("/:lotteryId/winners", getWinners);

module.exports = router;
