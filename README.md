# 抽奖系统升级版

## 一、技术栈更新

1. **前端：React**
   - 使用成熟的 React 框架进行构建，拥有组件化、状态管理（可搭配 Redux 或 React Hooks）等特性，便于维护与扩展。
   - 打包可使用 Create React App 或 Vite 等工具。

2. **后端：Node.js + Express**
   - 保留 Node.js 作为后端主框架，搭配 Express 路由处理 HTTP 请求。
   - 采用 **MySQL** 作为主要数据库存储用户、抽奖活动等核心数据；**Redis** 用于缓存、队列或抢占式抽奖等高并发场景。

3. **数据存储**
   - **MySQL**：存储用户信息、抽奖活动信息、报名记录等关系型数据。
   - **Redis**：可加速抽奖并发、实现抢占式抽奖的原子操作，并做定时任务缓存等。

---

## 二、用户属性字段

在升级版中，用户表（或用户相关数据结构）需要包含以下字段：

1. **用户ID** (`user_id`)
   - 主键，使用自增 ID 或 UUID，**唯一标识**用户。

2. **用户昵称** (`nickname`)
   - 最多 **10 个汉字**（或相应字符长度），用于在前端展示。

3. **用户名** (`username`)
   - **系统自动生成**，需要**唯一**，不宜过长（可限制在 15-20 个字符内）。
   - 用于用户登录或后端标识，不让用户自行设置。

4. **用户密码** (`password`)
   - **加密存储**（例如 bcrypt），不可明文保存。
   - 供用户登录时比对。

5. **用户邮箱** (`email`)
   - **唯一**，不可重复。
   - 用户可通过邮箱找回密码或接收通知。

6. **注册时间** (`register_time`)
   - 记录用户首次注册的时间戳或日期（例如 `DATETIME` / `TIMESTAMP` 类型）。

7. **登录时间** (`login_time`)
   - 记录用户**最近一次**登录时间，用于后端统计或安全分析。

8. **个性签名** (`signature`)
   - 用户可填写个人简介或签名，**长度不要超过 300 个汉字**。
   - 前端可做字数限制提示，后端同样需做校验。

---

## 三、系统功能简述

1. **注册与登录**
   - 前端 React 界面提供注册/登录表单；
   - 后端 Node.js 接收并写入 MySQL，邮箱唯一校验；
   - 密码需加密后存储。

2. **抽奖管理**
   - **React** 提供管理页面，管理员可创建/编辑抽奖活动；
   - **MySQL** 存活动配置，Redis 加速并发或存抢占式名额。
   - 前端可查看抽奖列表、活动详情等。

3. **用户管理**
   - React 管理页面可查看用户列表、搜索用户、查看其 `nickname`、`signature` 等；
   - 后端在 MySQL 中按条件查询，并返回 JSON。

4. **自动抽奖**
   - 依赖 Node.js 定时任务（如 `node-cron`）或自定义逻辑；
   - 到达截止时间后，后端从 MySQL / Redis 获取报名记录，随机抽取或确认前 N 位。

5. **参与抽奖**
   - 用户登录后，在前端点击“参与”即可报名；
   - 抢占式抽奖可在 Redis 做原子操作；随机抽奖在截止后统一处理。

---

## 四、数据结构示例

以下是可能的 **MySQL** 用户表结构示例（简化）：

```sql
CREATE TABLE `users` (
  `user_id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(20) NOT NULL UNIQUE,
  `nickname` VARCHAR(30) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `register_time` DATETIME NOT NULL,
  `login_time` DATETIME DEFAULT NULL,
  `signature` VARCHAR(600) DEFAULT NULL
  -- 600 字符足够存 300 个汉字
);
