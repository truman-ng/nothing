// controllers/UserController.js
const bcrypt = require("bcrypt");
const UserModel = require("../models/UserModel");

const UserController = {
    /**
     * 注册
     * body: { nickname, password, email, signature }
     */
    async register(req, res) {
        try {
            const { nickname, password, email, signature } = req.body;

            // 1. 校验
            if (!nickname || !password || !email) {
                return res.status(400).json({ message: "缺少必填字段" });
            }
            if (nickname.length > 10) {
                return res.status(400).json({ message: "昵称不能超过10个字符(示例)" });
            }
            if (signature && signature.length > 300) {
                return res.status(400).json({ message: "个性签名不能超过300个字符(示例)" });
            }

            // 2. 判断 email 是否已存在
            const existingUser = await UserModel.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({ message: "邮箱已被注册" });
            }

            // 3. 加密密码
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            // 4. 创建用户
            const { insertId, username } = await UserModel.createUser({
                nickname,
                passwordHash,
                email,
                signature
            });

            return res.json({
                message: "注册成功",
                user_id: insertId,
                username
            });
        } catch (err) {
            console.error("register error:", err);
            return res.status(500).json({ message: "服务器错误" });
        }
    },

    /**
     * 登录
     * body: { email, password }
     */
    async login(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ message: "缺少邮箱或密码" });
            }

            // 1. 查找用户
            const user = await UserModel.findByEmail(email);
            if (!user) {
                return res.status(400).json({ message: "用户不存在或密码错误" });
            }

            // 2. 验证密码
            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                return res.status(400).json({ message: "用户不存在或密码错误" });
            }

            // 3. 更新 login_time
            await UserModel.updateLoginTime(user.user_id);

            // 4. 返回用户信息
            return res.json({
                message: "登录成功",
                user: {
                    user_id: user.user_id,
                    username: user.username,
                    nickname: user.nickname,
                    email: user.email,
                    login_time: user.login_time
                }
            });
        } catch (err) {
            console.error("login error:", err);
            return res.status(500).json({ message: "服务器错误" });
        }
    }
};

module.exports = UserController;
