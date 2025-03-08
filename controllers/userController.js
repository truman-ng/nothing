// controllers/userController.js
const redis = require("../config/redis"); // 你的 Redis 连接

/**
 * 获取所有用户列表
 * 假设我们在 Redis 中维护一个 Set "users:all"，存放所有用户 ID（或 username）
 * 每个用户信息存储在 "user:{id}" 的 Hash 里
 */
async function getAllUsers(req, res) {
    try {
        // 1. 取出所有用户 ID
        const userIds = await redis.smembers("users:all"); // 或 "user:all"

        const users = [];
        // 2. 遍历每个 ID，从 Hash 里获取详细信息
        for (const id of userIds) {
            const data = await redis.hgetall(`user:${id}`);
            // data 可能包含 { username, badge, createdAt, ... }
            // 如果 username 存在 Hash 中，就用 data.username；否则用 id
            users.push({
                username: data.username,
                badge: data.badge || "",
                createdAt: data.createdAt || ""
            });
        }

        // 3. 返回 JSON
        return res.json({ users });
    } catch (err) {
        console.error("getAllUsers error:", err);
        return res.status(500).json({ message: "服务器错误" });
    }
}

/**
 * 按用户名关键字搜索用户
 * 示例：GET /users/search?username=xxx
 * 我们会遍历所有用户，过滤 username 中包含关键字的
 */
async function searchUsersByUsername(req, res) {
    try {
        // 1. 读取搜索关键字
        const keyword = req.query.username || "";

        // 2. 拿到所有用户 ID
        const userIds = await redis.smembers("users:all");

        const matched = [];
        // 3. 遍历每个用户，检查其 username 是否包含 keyword
        for (const id of userIds) {
            const data = await redis.hgetall(`user:${id}`);
            const uname = data.username || id;

            // 简单字符串包含判断
            if (uname.includes(keyword)) {
                matched.push({
                    username: uname,
                    badge: data.badge || "",
                    createdAt: data.createdAt || ""
                });
            }
        }

        // 4. 返回匹配的用户列表
        return res.json({ users: matched });
    } catch (err) {
        console.error("searchUsersByUsername error:", err);
        return res.status(500).json({ message: "服务器错误" });
    }
}

module.exports = { getAllUsers, searchUsersByUsername };
