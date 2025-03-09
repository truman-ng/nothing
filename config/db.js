require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
    host: process.env.PG_HOST,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    port: process.env.PG_PORT || 5432,

    // 关键参数：最大连接数
    max: process.env.PG_MAX_CONNECTION || 10,                // 最大并发客户端数 (默认10)
    idleTimeoutMillis: 30000 // 空闲连接超时时间(毫秒)，默认30000
    // connectionTimeoutMillis: 2000 // 连接建立超时时间(毫秒)，默认不限制
});

pool.on("connect", () => {
    console.log("PostgreSQL connected");
});

pool.on("error", (err) => {
    console.error("PostgreSQL error:", err);
});

module.exports = pool;