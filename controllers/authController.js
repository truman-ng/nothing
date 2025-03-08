// controllers/authController.js
const bcrypt = require("bcrypt");
const redis = require("../config/redis");
const { isSimpleSequence, isStrongPassword } = require("../utils/passwordCheck");

// 注册用户
async function register(req, res) {
    try {
        const { username, password, confirmPassword } = req.body;
        const ip = req.ip; // 或 req.headers['x-forwarded-for'] 等

        // 1. 检查是否缺少字段
        if (!username || !password || !confirmPassword) {
            return res.status(400).json({ message: "请输入用户名、密码及确认密码" });
        }

        // 2. 检查两次密码是否一致
        if (password !== confirmPassword) {
            return res.status(400).json({ message: "两次输入的密码不一致" });
        }

        // 3. 检查密码强度
        if (isSimpleSequence(password) || !isStrongPassword(password)) {
            return res.status(400).json({
                message: "密码不符合规则：长度≥6，需包含大小写字母和数字，且不能是简单连续字符串"
            });
        }

        // 4. 检查用户是否已存在
        const userKey = `user:${username}`;
        const userExists = await redis.exists(userKey);
        if (userExists) {
            return res.status(400).json({ message: "该用户名已注册，请直接登录" });
        }

        // 5. 哈希密码
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        const badge = 1;
        // 6. 存储到 Redis（使用 Hash 存储用户信息）
        await redis.hmset(userKey, {
            passwordHash,
            username,
            ip,
            badge,
            createdAt: Date.now()
        });
        // 5. 将 userId 加入 "users:all" 集合，方便后续查询
        await redis.sadd("users:all", username);
        // 7. 返回成功
        res.json({ message: "注册成功，请前往登录" });
    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ message: "服务器错误" });
    }
}

// 登录用户
async function login(req, res) {
    try {
        const { username, password } = req.body;
        const ip = req.ip;

        if (!username || !password) {
            return res.status(400).json({ message: "请输入用户名和密码" });
        }

        const userKey = `user:${username}`;
        const userData = await redis.hgetall(userKey);
        if (!userData.passwordHash) {
            return res.status(400).json({ message: "用户不存在或密码错误" });
        }

        // 比较密码
        const match = await bcrypt.compare(password, userData.passwordHash);
        if (!match) {
            return res.status(400).json({ message: "用户不存在或密码错误" });
        }

        // 更新用户IP和设备号
        await redis.hmset(userKey, {
            ip
        });

        // 登录成功，返回首页URL或 token（此处简单处理）
        res.json({
            message: "登录成功",
            user: {
                username: userData.username || "",
                createdAt: userData.createdAt || "",
                badge: userData.badge || 1,
            }
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "服务器错误" });
    }
}

module.exports = { register, login };
