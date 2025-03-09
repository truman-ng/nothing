create
database lottery_db
    with owner neondb_owner;
\c lottery_db;

-- 创建 users 表
CREATE TABLE IF NOT EXISTS users
(
    user_id
    SERIAL
    PRIMARY
    KEY,
    username
    VARCHAR
(
    20
) NOT NULL UNIQUE,
    nickname VARCHAR
(
    30
) NOT NULL,
    password VARCHAR
(
    255
) NOT NULL,
    email VARCHAR
(
    100
) NOT NULL UNIQUE,
    register_time TIMESTAMP NOT NULL,
    login_time TIMESTAMP DEFAULT NULL,
    signature VARCHAR
(
    600
) DEFAULT NULL
    );
