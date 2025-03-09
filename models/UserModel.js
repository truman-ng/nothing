// models/UserModel.js
const pool = require("../config/db");

// 工具函数：生成系统唯一 username
function generateSystemUsername() {
    const rand = Math.random().toString(36).substring(2, 8);
    return `nothing_${Date.now()}_${rand}`;
}

const UserModel = {
    /**
     * 创建用户
     * @param {object} user { nickname, passwordHash, email, signature }
     * @returns {Object} { insertId, username }
     */
    async createUser({ nickname, passwordHash, email, signature }) {
        // 生成 system username
        const username = generateSystemUsername();
        const now = new Date();

        const sql = `
      INSERT INTO users (username, nickname, password, email, register_time, signature)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING user_id, username
    `;
        const values = [
            username,
            nickname,
            passwordHash,
            email,
            now,
            signature || ""
        ];

        const result = await pool.query(sql, values);
        const row = result.rows[0];
        return { insertId: row.user_id, username: row.username };
    },

    /**
     * 根据 email 找用户
     */
    async findByEmail(email) {
        const sql = `SELECT * FROM users WHERE email = $1 LIMIT 1`;
        const result = await pool.query(sql, [email]);
        return result.rows[0] || null;
    },

    /**
     * 根据 username 找用户
     */
    async findByUsername(username) {
        const sql = `SELECT * FROM users WHERE username = $1 LIMIT 1`;
        const result = await pool.query(sql, [username]);
        return result.rows[0] || null;
    },

    /**
     * 更新用户登录时间
     */
    async updateLoginTime(userId) {
        const now = new Date();
        const sql = `UPDATE users SET login_time = $1 WHERE user_id = $2`;
        await pool.query(sql, [now, userId]);
    }
};

module.exports = UserModel;
