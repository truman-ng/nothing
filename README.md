# 项目功能概要

本项目是一个基于 **Node.js + Redis** 的抽奖系统，包含前端页面与后端逻辑，支持查看、创建、参与抽奖、自动开奖等功能。以下是对目前功能的简要概述。

---

## 1. 核心功能

1. **用户系统**
    - 使用 `localStorage` 存储用户信息（如 `username`, `badge` 等）。
    - 若 `badge === "NOTHING"`，则拥有管理员/特殊权限，可创建抽奖、查看用户管理页面。
    - 未登录状态下，页面会提示“去登录”或显示“未登录”状态，无法参与抽奖或使用管理功能。

2. **抽奖类型**
    - **随机抽取 (`random`)**：到截止时间后，一次性抽出指定数量的中奖者。
    - **抢占式抽奖 (`rush`)**：先到先得，前 N 位立即中奖，无需等待截止时间。

3. **抽奖活动管理**
    - **发布抽奖**：在前端 “创建抽奖” 页面（`createLottery.html`）中填写标题、描述、开始时间、结束时间、抽奖类型、中奖名额等，提交后在后端生成 `lottery:{id}`。
    - **查看抽奖列表**：在 `lotteryList.html` 中显示所有抽奖活动，包含“即将开始的活动”以及其他列表。
    - **抽奖详情**：点击“查看详情”按钮跳转到 `lotteryDetail.html?lotteryId=xxx`，可查看该活动的标题、描述、时间、类型、状态，以及 **参与者列表** 和 **中奖者列表**。

4. **参与抽奖**
    - 用户登录后，在 `lotteryList.html` 可点击“参与抽奖”按钮参与活动。
    - 对于 **随机抽取**：报名成功后等待截止时间统一抽奖。
    - 对于 **抢占式抽奖**：若名额未满，会立即成为中奖者。

5. **查看中奖名单**
    - 在抽奖详情页面（`lotteryDetail.html`）可同时显示所有 **参与者** 和 **已中奖者**。
    - 在 `lotteryList.html` 也可以点击“查看中奖者”按钮（活动结束后才可见或可点击），查看中奖名单。

6. **自动开奖**
    - 使用 **node-cron** 定时任务，每秒或每分钟检查是否有到达截止时间但尚未抽奖的 `random` 模式活动，自动执行抽奖逻辑：
        1. 随机从报名列表抽出指定数量。
        2. 写入 `winners` 集合。
        3. 更新活动 `status = "finished"`。

7. **用户管理**
    - 若 `badge === "NOTHING"`，在 `lotteryList.html` 会出现“用户菜单”按钮。
    - 点击后跳转到 `userManagement.html`，可查看所有用户并支持按 `username` 搜索。
    - 后端提供 `GET /users`、`GET /users/search?username=xxx` 等接口，并用 Redis `users:all` 维护用户列表。

---

## 2. 前端页面结构

1. **`index.html`**
    - 示例登录/注册页面。
    - 用户登录后，将用户信息存入 `localStorage`；未登录则无法参与抽奖或查看管理功能。

2. **`lotteryList.html`**
    - 显示当前登录用户（或提示未登录）。
    - 创建抽奖按钮（仅 `badge === "NOTHING"` 时可见）。
    - 用户菜单按钮（仅 `badge === "NOTHING"` 时可见）。
    - 即将开始的抽奖活动（取 `startTime > now` 中最早的）。
    - 其余抽奖列表（可点击“参与抽奖”、“查看详情”、“查看中奖者”等）。

3. **`lotteryDetail.html`**
    - 根据 URL 参数（`lotteryId`）获取抽奖详情。
    - 显示活动标题、描述、时间、类型、状态。
    - 显示所有 **参与者** 和 **中奖者**。

4. **`createLottery.html`**
    - 管理员发布新抽奖活动。
    - 输入标题、描述、时间、类型、中奖名额等，提交到后端 `/lottery` 接口。

5. **`userManagement.html`**
    - 管理员查看用户列表（`GET /users`）或搜索用户（`GET /users/search`）。
    - 显示匹配到的用户列表。

---

## 3. 后端逻辑 (Node.js + Redis)

1. **路由示例**
    - `POST /auth/register` / `POST /auth/login`（用户注册、登录）。
    - `POST /lottery`：创建抽奖。
    - `GET /lottery/list`：获取抽奖列表（包含时间、类型、状态等）。
    - `GET /lottery/:id`：获取某个抽奖详情（含 `participants`, `winners`）。
    - `POST /lottery/:id/enter`：用户报名抽奖。
    - `POST /lottery/:id/draw`：手动抽奖（随机模式）。
    - `GET /lottery/:id/winners`：查看中奖者列表。
    - `GET /users` / `GET /users/search`：查看或搜索用户。

2. **Redis 存储结构**
    - `lottery:all` (Set)：记录所有抽奖 ID。
    - `lottery:{id}` (Hash)：存抽奖信息 `{ title, description, startTime, endTime, type, totalWinners, status }`。
    - `lottery:{id}:participants` (Set)：报名用户的 `username`。
    - `lottery:{id}:winners` (Set)：中奖用户的 `username`。
    - `users:all` (Set)：所有用户 ID / `username`。
    - `user:{username}` (Hash)：用户信息 `{ passwordHash, badge, createdAt, ... }`。

3. **自动开奖 (node-cron)**
    - `cron.schedule("* * * * * *", ...)` 每秒检查或每分钟检查：
        1. 找到 **到达结束时间** 且 **status != finished** 且 **type='random'** 的活动。
        2. 随机抽取报名者写入 `winners`，更新 `status='finished'`。

---

## 4. 主要流程

1. **用户注册/登录**
    - 注册：`user:{username}` + `SADD users:all username`。
    - 登录：在前端保存到 `localStorage`；后端返回 `badge` 等权限信息。

2. **管理员发布抽奖**
    - `createLottery.html` => `POST /lottery`。
    - 后端存 `lottery:{id}`，并 `SADD lottery:all id`。

3. **用户查看抽奖列表**
    - `lotteryList.html` => `GET /lottery/list`。
    - 显示进行中/已结束/即将开始的活动。

4. **用户参与**
    - `POST /lottery/:id/enter` => Redis `lottery:{id}:participants` 添加报名用户。
    - 抢占式直接中奖；随机式等截止后统一抽奖。

5. **抽奖结束**
    - **node-cron** 定时或 `POST /lottery/:id/draw` 手动执行：
        1. 随机抽取 `winners`；
        2. 更新 `status='finished'`。

6. **查看详情**
    - `lotteryDetail.html?lotteryId=xxx` => `GET /lottery/:id` => 显示活动信息、`participants`、`winners`。

7. **用户管理**
    - 管理员在 `userManagement.html` => `GET /users` 或 `GET /users/search?username=xxx` => 显示或搜索用户列表。

---

## 5. 总结

通过上述功能，项目已形成一个**基础可用**的抽奖系统：

- **用户**可以注册、登录，查看抽奖列表并报名参与；
- **管理员**可以创建抽奖、查看用户列表，并通过定时任务自动抽奖；
- 用户可在**抽奖详情**页面或列表中查看**中奖者**名单。

这就是项目目前实现的主要功能和流程。
