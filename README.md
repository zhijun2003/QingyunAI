# 清云AI - AI一站式助手平台

<div align="center">

**基于 Nuxt 4 + Vue 3 的现代化 AI 助手平台**

支持多模型对话 · 精确计费系统 · 知识库RAG · 智能体 · 多模态生成

[![Nuxt 4](https://img.shields.io/badge/Nuxt-4.2.1-00DC82?logo=nuxt.js&logoColor=white)](https://nuxt.com/)
[![Vue 3](https://img.shields.io/badge/Vue-3.5.24-4FC08D?logo=vue.js&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[在线演示](https://demo.qingyun-ai.com) · [开发文档](CLAUDE.md) · [问题反馈](https://github.com/zhijun2003/QingyunAI/issues)

</div>

---

## ✨ 核心特性

### 💬 AI 对话系统
- **42+ 主流模型**：OpenAI GPT-4/4o、Claude 3.5、Gemini 1.5 Pro、DeepSeek 等
- **Provider-Model 架构**：统一管理多个 API 提供商，自动同步模型和价格
- **API 密钥轮询**：多密钥加权轮询、优先级调度、自动故障转移
- **流式响应**：实时打字效果，提升用户体验
- **Markdown 增强**：代码高亮、数学公式（KaTeX）、图表渲染（Mermaid）

### 💰 精确计费系统
- **按量计费**：基于 tiktoken 精确计算 tokens，精确到分
- **多种计费模式**：Token 计费 / 按次计费 / 按秒计费
- **余额管理**：实时余额显示、低余额预警、交易记录详情
- **赠送机制**：注册赠送 ¥5、每日签到 ¥0.5、推荐好友 ¥10
- **多支付方式**：支付宝、微信支付

### 👤 多登录方式
- 📱 手机号 + 验证码
- 📧 邮箱 + 验证码
- 🔑 用户名 + 密码
- 🤝 微信服务号扫码登录

### 📚 知识库系统（RAG）
- **文档支持**：PDF、Word、TXT、Markdown
- **智能分块**：自动优化文档切分
- **向量检索**：基于 pgvector 的高效相似度搜索
- **RAG 对话增强**：引用来源显示，回答更准确

### 🤖 智能体系统
- **可视化构建器**：拖拽式配置系统提示词、工具、知识库
- **工作流编排**：复杂任务自动化
- **智能体市场**：发布、分享、复制智能体

### 🎨 多模态生成
- **图像生成**：DALL-E 3、Stable Diffusion、Midjourney
- **视频生成**：Runway、可灵（文生视频、图生视频）
- **音乐生成**：Suno AI
- **PPT 生成**：自动排版、主题选择、导出 PPTX
- **语音合成**：OpenAI TTS、ElevenLabs（多语言支持）

### 📎 附件存储
- **多种存储方式**：本地 / MinIO / 腾讯云 COS / 阿里云 OSS / 免费图床
- **自动缩略图**：图片自动生成缩略图
- **附件管理**：统一管理所有上传文件

### 🎛️ 管理后台
- **Provider 管理**：添加/编辑/删除 API 提供商，测试连接
- **API 密钥管理**：多密钥轮询配置，权重和优先级设置
- **模型管理**：自定义分组，价格配置，模型启用/禁用
- **系统配置**：功能开关、赠送金额、充值套餐等动态配置
- **用户管理**：用户列表、余额调整
- **统计报表**：用户统计、收入统计、用量统计

---

## 🚀 快速开始

### 环境要求

- Node.js >= 20.x
- pnpm >= 9.x
- PostgreSQL >= 15.x（需启用 pgvector 扩展）
- Redis >= 7.x

### 安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/zhijun2003/QingyunAI.git
cd QingyunAI

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入必要的配置：
#   - DATABASE_URL: PostgreSQL 连接字符串
#   - REDIS_URL: Redis 连接字符串
#   - JWT_SECRET: JWT 密钥（至少 32 字符）
#   - ENCRYPTION_KEY: AES-256 加密密钥（64 位十六进制）

# 4. 初始化数据库
# 4.1 启用 pgvector 扩展
psql -d your_database -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 4.2 生成 Prisma Client
pnpm --filter @qingyun/database db:generate

# 4.3 创建数据库表
pnpm --filter @qingyun/database db:migrate

# 4.4 初始化数据（创建管理员账号）
pnpm --filter @qingyun/database db:seed

# 5. 启动开发服务器
pnpm dev
```

访问 http://localhost:3000

### 管理员账号

- 用户名：`admin`
- 密码：`admin123456`

⚠️ **请登录后立即修改密码！**

---

## 📦 技术栈

### 前端
- **Nuxt 4.2.1** - Vue 3 全栈框架
- **Vue 3.5.24** - 渐进式 JavaScript 框架（56% 内存优化）
- **TypeScript 5.5+** - 类型安全（strict 模式）
- **TailwindCSS 4.0** - 原子化 CSS 框架
- **Naive UI** - Vue 3 UI 组件库
- **Pinia** - 状态管理

### 后端
- **Nitro 3** - Nuxt 服务器引擎
- **Prisma 5.x** - TypeScript ORM
- **PostgreSQL 15+** - 主数据库（pgvector 扩展）
- **Redis 7+** - 缓存/会话/队列
- **BullMQ** - 任务队列

### AI & 核心库
- **@dqbd/tiktoken** - Token 精确计数（关键：计费准确性）
- **OpenAI SDK** - GPT 系列模型
- **Anthropic SDK** - Claude 系列模型
- **@google/generative-ai** - Gemini 系列模型
- **Langchain** - LLM 应用框架

---

## 📁 项目结构

```
QingyunAI/
├── packages/               # Monorepo 共享包
│   ├── database/          # 数据库包（Prisma）
│   ├── ai-runtime/        # AI 运行时（密钥轮询、Provider 适配器）
│   ├── billing/           # 计费系统
│   ├── constants/         # 常量定义
│   └── types/             # TypeScript 类型
│
├── server/                # Nuxt Nitro 服务端
│   ├── api/              # API 路由
│   ├── services/         # 业务逻辑层
│   ├── middleware/       # 服务端中间件
│   └── jobs/             # 后台任务
│
├── app/                   # Nuxt 应用目录
│   ├── components/        # Vue 组件
│   ├── pages/            # 页面路由
│   ├── layouts/          # 布局组件
│   └── composables/      # 组合式函数
│
├── .env                   # 环境变量
├── CLAUDE.md              # 开发文档（完整架构和规范）
└── README.md              # 本文档
```

**详细架构说明**：查看 [CLAUDE.md](CLAUDE.md) 获取完整的项目架构和开发规范。

---

## 💻 开发指南

### 常用命令

```bash
# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start

# 代码检查
pnpm lint

# 类型检查
pnpm typecheck

# 运行测试
pnpm test

# 数据库操作
pnpm --filter @qingyun/database db:generate    # 生成 Prisma Client
pnpm --filter @qingyun/database db:migrate     # 创建迁移
pnpm --filter @qingyun/database db:seed        # 初始化数据
pnpm --filter @qingyun/database db:studio      # 打开 Prisma Studio
```

### Git 提交规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```bash
git commit -m "feat(model): 实现 API 密钥加权轮询机制"
git commit -m "fix(billing): 修复 Token 计数精度问题"
git commit -m "docs: 更新部署文档"
```

**Type 类型**：`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

---

## 🗺️ 功能路线图

### ✅ Phase 1: 核心基础架构（已完成）
- [x] 项目初始化和配置
- [x] Monorepo 架构搭建
- [x] 数据库设计（Prisma Schema）
- [x] API 密钥轮询机制
- [x] 附件存储方案

### 🚧 Phase 2: 核心功能开发（进行中）
- [ ] 用户认证系统（手机/邮箱/用户名/微信）
- [ ] AI 对话系统（多模型支持、流式响应）
- [ ] 计费系统核心（Token 计数、价格计算、余额管理）
- [ ] 管理后台（模型配置、API 密钥管理）

### 📋 Phase 3: 高级功能（计划中）
- [ ] 知识库系统（RAG）
- [ ] 智能体系统
- [ ] 多模态生成（图像/视频/音乐）

---

## 🤝 参与贡献

我们欢迎所有形式的贡献！

### 贡献方式

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat(chat): add some amazing feature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

---

## 🙏 致谢

感谢以下优秀的开源项目提供灵感和参考：

- [ChatGPT-Next-Web](https://github.com/ChatGPTNextWeb/ChatGPT-Next-Web) - UI 设计参考
- [Lobe-Chat](https://github.com/lobehub/lobe-chat) - Monorepo 架构参考
- [FastGPT](https://github.com/labring/FastGPT) - RAG 实现参考
- [One-API](https://github.com/songquanpeng/one-api) - 多渠道管理参考
- [CherryStudio](https://github.com/kangfenmao/cherry-studio) - UI/UX 参考

---

## 📮 联系方式

- **作者**：zhijun2003
- **邮箱**：zhijun2003@foxmail.com
- **GitHub**：https://github.com/zhijun2003/QingyunAI
- **Issues**：[提交问题](https://github.com/zhijun2003/QingyunAI/issues)

---

<div align="center">

**清云AI - 让AI触手可及**

Made with ❤️ by zhijun2003

</div>
