# Meeting Reminder Bot

Telegram 周会提醒机器人：定时发送会前 24 小时提醒（简体中文），可选 OpenAI 趣味文案，并包含本周 HL/AI 案例分享轮值。

## 环境变量

复制 `.env.example` 为 `.env` 并填写：

- `BOT_TOKEN` – Telegram Bot Token
- `OPENAI_API_KEY` – OpenAI API Key（可选，缺省时使用默认文案）
- `TARGET_GROUP_ID` – 接收提醒的群组 ID（用 `/get_id` 在群里获取）
- `MEETING_LINK` – 会议记录模板链接

可选：`DB_PATH` – SQLite 数据库路径（默认 `reminder.db`），部署时可用于持久化目录。

## 本地运行

```bash
npm install
npm run build
# 配置 .env 后
npm start
```

## 部署到服务器

### 方式一：PM2（推荐）

1. 在服务器上克隆/上传项目，进入项目目录。
2. 安装依赖并构建：
   ```bash
   npm ci
   npm run build
   ```
3. 在项目根目录创建 `.env`，填入上述环境变量。
4. 安装 PM2 并启动：
   ```bash
   npm install -g pm2
   pm2 start ecosystem.config.cjs
   pm2 save
   pm2 startup   # 按提示设置开机自启
   ```

常用命令：`pm2 status`、`pm2 logs meeting-reminder-bot`、`pm2 restart meeting-reminder-bot`。

### 方式二：Render

1. 将本仓库（或仅 `meeting-reminder-bot` 目录）连接到 [Render](https://render.com)。
2. 在 Dashboard 中创建 **Blueprint**：New → Blueprint，选择该仓库，Render 会读取 `render.yaml`。
3. 若仓库根目录不是本应用（例如 monorepo），在 Blueprint 同步后的服务里设置 **Root Directory** 为 `meeting-reminder-bot`。
4. 在服务的 **Environment** 中添加：
   - `BOT_TOKEN`
   - `OPENAI_API_KEY`（可选）
   - `TARGET_GROUP_ID`
   - `MEETING_LINK`
   - `DB_PATH` 已在 Blueprint 中设为 `/data/reminder.db`（持久化磁盘已挂载到 `/data`）。
5. 部署完成后 Worker 会持续运行；定时提醒与 `/test_reminder` 会按设定工作。

注意：Background Worker 需 **Starter** 及以上计划（无免费档）。

### 方式三：Docker

1. 构建镜像：
   ```bash
   docker build -t meeting-reminder-bot .
   ```

2. 运行（请将 `BOT_TOKEN`、`OPENAI_API_KEY`、`TARGET_GROUP_ID`、`MEETING_LINK` 换成真实值；数据会持久化到当前目录的 `./data`）：
   ```bash
   docker run -d --name meeting-reminder-bot \
     -v $(pwd)/data:/app/data \
     -e BOT_TOKEN=your_bot_token \
     -e OPENAI_API_KEY=your_openai_key \
     -e TARGET_GROUP_ID=your_group_id \
     -e MEETING_LINK=https://your-meeting-link \
     meeting-reminder-bot
   ```

   或使用 `.env` 文件（注意不要提交含密钥的 `.env`）：
   ```bash
   docker run -d --name meeting-reminder-bot \
     -v $(pwd)/data:/app/data \
     --env-file .env \
     meeting-reminder-bot
   ```

## 命令

- `/set_schedule <day> <hour> <minute>` – 设置周会时间（day 0–6 周日–周六）
- `/cancel_this_week` – 取消本周提醒
- `/uncancel_this_week` – 恢复本周提醒
- `/test_reminder` – 发送一条测试提醒
- `/get_id` – 获取当前群组 ID
- `/help` – 帮助
