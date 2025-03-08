// cronJobs.js
const cron = require("node-cron");
const redis = require("../config/redis"); // 你的 Redis 连接
const { doDrawLottery } = require("../controllers/lotteryController");

// 每秒检查一次
cron.schedule("* * * * * *", async () => {
    try {
        console.log("定时任务：检查已结束的随机抽奖...");

        // 1. 查找所有已到结束时间 but 未抽奖、类型=random 的活动
        // （根据你的存储结构自行实现）
        const endedRandomLotteries = await findEndedRandomLotteries();

        // 2. 对这些活动执行抽奖
        for (const lottery of endedRandomLotteries) {
            console.log(`开始对抽奖活动 ${lottery.lotteryId} 进行随机抽奖...`);
            await doDrawLottery(lottery.lotteryId);
        }
    } catch (err) {
        console.error("定时任务出错:", err);
    }
});

/**
 * 查找已到结束时间 but 未抽奖 & 类型=random 的活动
 * 假设在 Redis 中存储: lottery:<lotteryId> => { endTime, type, status }
 */
async function findEndedRandomLotteries() {
    const now = Math.floor(Date.now() / 1000);
    // 先拿到所有抽奖 ID
    const lotteryIds = await redis.smembers("lottery:all");
    const results = [];

    for (const id of lotteryIds) {
        const key = `lottery:${id}`;
        const data = await redis.hgetall(key);
        if (!data.type) continue;

        const endTime = parseInt(data.endTime, 10) || 0;
        const isFinished = data.status === "finished";
        const isRandom = data.type === "random";

        // 满足条件: 已过结束时间 && type=random && status != finished
        if (now > endTime && isRandom && !isFinished) {
            results.push({
                lotteryId: id,
                ...data
            });
        }
    }
    return results;
}
