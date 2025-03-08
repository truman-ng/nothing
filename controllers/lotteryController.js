// controllers/lotteryController.js
const { nanoid } = require("nanoid");
const redis = require("../config/redis");

// 时间戳工具
function getUnixTime() {
    return Math.floor(Date.now() / 1000); // 秒级 Unix 时间戳
}

// 1. 新建抽奖 (POST /lottery)
async function createLottery(req, res) {
    try {
        const {
            title,
            description,
            startTime, // 前端传秒级或毫秒级都行，自行转换
            endTime,
            type, // 'random' or 'rush'
            totalWinners,
        } = req.body;

        // 生成一个 lotteryId
        const lotteryId = nanoid(10);

        // 存储到 Redis (Hash)
        const key = `lottery:${lotteryId}`;
        await redis.hset(key, {
            title,
            description,
            startTime,
            endTime,
            type,
            totalWinners,
            status: "published", // 默认已发布
            createdAt: getUnixTime(),
        });

        // **把这个 lotteryId 加入到一个记录所有抽奖ID的集合**
        await redis.sadd("lottery:all", lotteryId);

        return res.json({
            lotteryId,
            message: "抽奖创建成功",
        });
    } catch (err) {
        console.error("createLottery error:", err);
        return res.status(500).json({ message: "服务器错误" });
    }
}

// 2. 获取抽奖详情 (GET /lottery/:lotteryId)
async function getLottery(req, res) {
    try {
        const { lotteryId } = req.params;
        const key = `lottery:${lotteryId}`;
        console.log("key", key);
        const data = await redis.hgetall(key);
        console.log("data", data);
        if (!data) {
            return res.status(404).json({ message: "抽奖不存在" });
        }

        // 读取参与者
        const participantsKey = `lottery:${lotteryId}:participants`;
        const participants = await redis.smembers(participantsKey);

        // 读取中奖者
        const winnersKey = `lottery:${lotteryId}:winners`;
        const winners = await redis.smembers(winnersKey);

        // 返回抽奖信息 + participants + winners
        return res.json({
            lotteryId: lotteryId,
            ...data, // title, description, startTime, endTime, type, status, ...
            participants,
            winners
        });
    } catch (err) {
        console.error("getLotteryById error:", err);
        return res.status(500).json({ message: "服务器错误" });
    }
}

// 3. 报名抽奖 (POST /lottery/:id/enter)
async function enterLottery(req, res) {
    try {
        const { lotteryId } = req.params; // 假设前端传递或从session中取
        const { username } = req.body; // 假设前端传递或从session中取
        const ip = req.ip; // Express默认拿到的ip, 如果有代理需要 trust proxy

        // 3.1 检查抽奖活动是否存在 & 是否在报名时间内
        const lotteryKey = `lottery:${lotteryId}`;
        const lotteryData = await redis.hgetall(lotteryKey);
        if (!lotteryData.title) {
            return res.status(404).json({ message: "抽奖不存在" });
        }
        if (username === null || username === "") {
            return res.status(404).json({ message: "username不存在" });
        }
        const now = getUnixTime();
        const startTime = parseInt(lotteryData.startTime, 10);
        const endTime = parseInt(lotteryData.endTime, 10);

        if (now < startTime) {
            return res.status(400).json({ message: "抽奖未开始" });
        }
        if (now > endTime) {
            return res.status(400).json({ message: "抽奖已截止" });
        }

        // 3.2 检查是否已经报名过
        const participantsKey = `lottery:${lotteryId}:participants`;
        const isMember = await redis.sismember(participantsKey, username);
        if (isMember) {
            return res.status(400).json({ message: "你已报名过该抽奖" });
        }

        // 3.3 同一 IP 下最多 10 个用户
        const ipCountKey = `lottery:${lotteryId}:ipCount:${ip}`;
        const ipCount = await redis.get(ipCountKey);
        if (ipCount && parseInt(ipCount, 10) >= 10) {
            return res
                .status(400)
                .json({ message: "同一IP下报名用户过多，无法继续报名" });
        }

        // 如果还没到10个，就自增1，并设置一个较长的过期时间 (活动结束后即可)
        await redis.incr(ipCountKey);
        // 设置过期时间，比如活动结束后
        if (!ipCount) {
            const expireSec = endTime - now + 3600; // 多给点冗余
            await redis.expire(ipCountKey, expireSec);
        }

        // 3.4 如果是抢占式抽奖，需要检查用户请求频率 & 名额
        if (lotteryData.type === "rush") {
            // (a) 防刷：1 秒内同一用户请求超过 5 次 -> 封禁
            const userReqKey = `lottery:${lotteryId}:userReq:${username}`;
            const reqCount = await redis.incr(userReqKey);
            if (reqCount === 1) {
                // 第一次请求，设置 1 秒后过期
                await redis.expire(userReqKey, 1);
            }
            if (reqCount > 5) {
                return res
                    .status(400)
                    .json({ message: "你操作过于频繁，禁止参与本次抢占式抽奖" });
            }

            // (b) 判断是否超过总名额
            const countKey = `lottery:${lotteryId}:count`; // 已报名/中奖数
            let currentCount = await redis.get(countKey);
            if (!currentCount) {
                currentCount = 0;
            } else {
                currentCount = parseInt(currentCount, 10);
            }

            const totalWinners = parseInt(lotteryData.totalWinners, 10);
            if (currentCount >= totalWinners) {
                return res.json({ message: "名额已满", isWinner: false });
            }

            // 如果还有名额，直接报名 + 设为中奖
            await redis.sadd(participantsKey, username);
            await redis.incr(countKey);

            // 把用户存到 winners 集合
            const winnersKey = `lottery:${lotteryId}:winners`;
            await redis.sadd(winnersKey, username);

            return res.json({ message: "恭喜你抢到名额！", isWinner: true });
        } else {
            // 3.5 随机抽奖：只报名即可，等待截止后系统自动抽
            await redis.sadd(participantsKey, username);

            return res.json({
                message: "你已成功报名，等待开奖",
                isWinner: false,
            });
        }
    } catch (err) {
        console.error("enterLottery error:", err);
        return res.status(500).json({ message: "服务器错误" });
    }
}

async function doDrawLottery(lotteryId) {
    try {
        const lotteryKey = `lottery:${lotteryId}`;
        const lotteryData = await redis.hgetall(lotteryKey);

        if (!lotteryData.title) {
            return ;
        }
        if (lotteryData.type !== "random") {
            return ;
        }

        const endTime = parseInt(lotteryData.endTime, 10);
        const now = getUnixTime();
        if (now < endTime) {
            return ;
        }

        // 已经抽过就不再重复
        if (lotteryData.status === "finished") {
            return ;
        }

        // 获取所有报名用户
        const participantsKey = `lottery:${lotteryId}:participants`;
        const userList = await redis.smembers(participantsKey);

        // 随机抽取 totalWinners 个
        const totalWinners = parseInt(lotteryData.totalWinners, 10) || 1;
        if (userList.length === 0) {
            // 没人报名，直接结束
            await redis.hset(lotteryKey, "status", "finished");
            return ;
        }

        // 如果报名人数 < totalWinners，则全中
        let winners = [];
        if (userList.length <= totalWinners) {
            winners = userList;
        } else {
            // Fisher-Yates 洗牌算法或简单 random
            winners = shuffleArray(userList).slice(0, totalWinners);
        }

        // 将 winners 存到 Redis
        const winnersKey = `lottery:${lotteryId}:winners`;
        for (const w of winners) {
            await redis.sadd(winnersKey, w);
        }

        // 更新抽奖状态
        await redis.hset(lotteryKey, "status", "finished");


    } catch (err) {
        console.error("drawLottery error:", err);
    }
}

// 工具：随机打乱数组
function shuffleArray(arr) {
    const array = [...arr];
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// 5. 查看中奖列表 (GET /lottery/:id/winners)
async function getWinners(req, res) {
    try {
        const { lotteryId } = req.params;
        const winnersKey = `lottery:${lotteryId}:winners`;
        const winnerList = await redis.smembers(winnersKey);
        return res.json({ winners: winnerList });
    } catch (err) {
        console.error("getWinners error:", err);
        return res.status(500).json({ message: "服务器错误" });
    }
}

async function getLotteryList(req, res) {
    try {
        // 1. 获取所有抽奖 ID
        const lotteryIds = await redis.smembers("lottery:all");
        const results = [];

        // 2. 逐个读取抽奖信息
        for (const id of lotteryIds) {
            const key = `lottery:${id}`;
            const data = await redis.hgetall(key);

            if (data.title) {
                data.lotteryId = id;

                // 将字符串转为数字，避免后续排序出错
                data.createdAt = parseInt(data.createdAt || "0", 10);
                data.startTime = parseInt(data.startTime || "0", 10);
                data.endTime = parseInt(data.endTime || "0", 10);

                // 可选：获取已报名人数
                data.participantCount = await redis.scard(`lottery:${id}:participants`);

                results.push(data);
            }
        }

        // 3. 按照 createdAt 倒序排序（大到小）
        results.sort((a, b) => b.createdAt - a.createdAt);

        // 如果你要按 startTime 或 endTime 排序，改为：
        // results.sort((a, b) => b.startTime - a.startTime);
        // results.sort((a, b) => b.endTime - a.endTime);

        return res.json({
            lotteries: results,
            total: results.length,
        });
    } catch (err) {
        console.error("getLotteryList error:", err);
        return res.status(500).json({ message: "服务器错误" });
    }
}

module.exports = {
    getLotteryList,
    createLottery,
    getLottery,
    enterLottery,
    doDrawLottery,
    getWinners,
};
