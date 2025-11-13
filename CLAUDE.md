# 清云AI - 项目开发文档

> 本文档作为项目的长期记忆，包含完整的架构设计、开发规范和实现细节

## 📋 目录

- [项目概述](#项目概述)
- [核心架构](#核心架构)
- [数据库设计](#数据库设计)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [管理后台 API](#管理后台-api)
- [开发规范](#开发规范)
- [部署指南](#部署指南)

---

## 🎯 项目概述

**清云AI** 是一个功能完整的 AI 一站式助手平台，采用 Nuxt 4 + Vue 3 全栈架构。

### 核心特性

- **多模型对话**：支持 42+ 主流 AI 模型（OpenAI、Claude、Gemini、DeepSeek 等）
- **精确计费系统**：基于 tiktoken 的 Token 级计费，Decimal 类型处理金额
- **多提供商管理**：统一管理多个 AI API 提供商，自动同步模型和价格
- **API 密钥轮询**：支持多密钥加权轮询、优先级、限额管理、自动故障转移
- **知识库 RAG**：基于 pgvector 的向量检索，支持 PDF/Word/TXT/Markdown
- **智能体系统**：可视化构建 AI 智能体，工作流编排
- **多模态生成**：图像/视频/音乐/PPT/语音生成
- **附件存储**：支持本地/MinIO/腾讯云 COS/阿里云 OSS/免费图床
- **管理后台**：动态配置（所有 AI 模型、API 密钥、功能开关等存数据库）
- **多登录方式**：手机/邮箱/用户名/微信扫码

### 技术亮点

1. **Provider-Model 两层架构**：灵活的提供商和模型管理
2. **配置热更新**：数据库配置，无需重启服务器
3. **Monorepo 架构**：核心业务逻辑独立包，可测试性强
4. **类型安全**：TypeScript strict 模式，运行时 Zod 验证
5. **高性能**：Redis 缓存 + BullMQ 队列 + PostgreSQL 优化

---

## 🏗️ 核心架构

### Provider-Model 两层架构

```
Provider（API 提供商）
  ├─ ProviderApiKey[] (多个密钥，加权轮询)
  └─ Model[]
      └─ groupName (管理员自定义分组)

前端显示：
  Tab: 对话模型
    - GPT-4o (OpenAI 官方) ¥0.03/1K
    - GPT-4o (云雾AI) ¥0.015/1K ⭐ 推荐
    - Claude 3.5 (Anthropic) ¥0.015/1K

  Tab: 绘图模型
    - DALL-E 3 (OpenAI) ¥0.04/张
    - Midjourney (Midjourney) ¥0.08/张
```

### 核心设计原则

1. **简化架构**：不使用三层架构，直接 Provider → Model，Model 有 groupName 字段
2. **统一界面**：所有模型在一个选择器，按 groupName 分组显示
3. **灵活分组**：管理员可自定义分组名称（如"对话模型"、"绘图模型"）
4. **多源管理**：同一个模型可以来自不同 Provider，显示价格对比
5. **数据库配置**：AI 模型、API 密钥、功能开关等都在管理后台配置

### API 密钥轮询机制

```typescript
// 加权随机选择算法
const totalWeight = keys.reduce((sum, k) => sum + k.weight, 0)
let random = Math.random() * totalWeight

for (const key of keys) {
  random -= key.weight
  if (random <= 0) {
    return key  // 选中此密钥
  }
}
```

**特性**：
- ✅ 加权轮询（weight 字段）
- ✅ 优先级排序（priority 字段）
- ✅ 错误跟踪（errorCount >= 5 自动禁用）
- ✅ 限额管理（dailyLimit / monthlyLimit）
- ✅ 最近最少使用（LRU）

### 附件存储策略

支持多种存储方式，按优先级选择：

1. **免费图床**（仅图片）：https://img.scdn.io/ 等
2. **腾讯云 COS**：适合国内用户，稳定可靠
3. **MinIO**：自建对象存储，完全可控
4. **本地存储**：开发环境和小规模部署
5. **阿里云 OSS** / **AWS S3**：备选方案

**存储类型枚举**：
```prisma
enum StorageType {
  LOCAL          // 本地存储
  MINIO          // MinIO 对象存储
  COS            // 腾讯云 COS
  OSS            // 阿里云 OSS
  S3             // AWS S3
  IMGBED         // 免费图床（仅图片）
}
```

---

## 💾 数据库设计

### 核心表结构

#### Provider（API 提供商）

```prisma
model Provider {
  id          String   @id @default(cuid())

  name        String   @unique        // "openai-official", "yunwu-ai"
  displayName String                  // "OpenAI 官方", "云雾AI"
  type        ProviderType           // OPENAI, GEMINI, ANTHROPIC, etc.
  baseUrl     String                 // API 地址

  // 自动拉取配置
  autoSync        Boolean  @default(false)    // 自动同步模型
  syncInterval    Int?     @default(3600)     // 同步间隔（秒）
  lastSyncAt      DateTime?
  lastSyncStatus  String?

  isActive    Boolean  @default(true)

  apiKeys     ProviderApiKey[]        // 一对多：支持多个密钥轮询
  models      Model[]
}

enum ProviderType {
  OPENAI               // OpenAI 格式（官方 + 兼容接口）
  GEMINI               // Google Gemini
  ANTHROPIC            // Anthropic Claude
  DEEPSEEK             // DeepSeek
  MIDJOURNEY           // Midjourney 绘图
  STABLE_DIFFUSION     // Stable Diffusion
  KELING               // 可灵视频
  JIMENG               // 即梦视频
  RUNWAY               // Runway 视频
  SUNO                 // Suno 音乐
  CUSTOM               // 自定义接口
}
```

#### ProviderApiKey（API 密钥）

```prisma
model ProviderApiKey {
  id          String   @id @default(cuid())

  providerId  String
  provider    Provider @relation(...)

  name        String                  // 密钥名称（便于识别）
  keyEncrypted String                 // AES-256 加密后的密钥
  keyIv       String                  // 加密 IV

  // 轮询配置
  weight      Int      @default(1)    // 权重（用于加权轮询）
  priority    Int      @default(0)    // 优先级（数字越小优先级越高）

  // 限额配置
  dailyLimit  Int?                    // 每日请求限额
  dailyUsed   Int      @default(0)    // 今日已使用
  monthlyLimit Int?                   // 每月限额
  monthlyUsed  Int     @default(0)    // 本月已使用

  // 状态
  isActive    Boolean  @default(true)
  errorCount  Int      @default(0)    // 错误计数（>= 5 自动禁用）
  lastUsedAt  DateTime?
}
```

#### Model（模型实例）

```prisma
model Model {
  id          String   @id @default(cuid())

  providerId  String
  provider    Provider @relation(...)

  modelName   String               // "gpt-4o", "claude-3-5-sonnet"
  displayName String               // "GPT-4o", "Claude 3.5 Sonnet"

  // 分组信息（管理员可自定义）⭐ 核心字段
  groupName   String   @default("未分组")  // "对话模型", "绘图模型", "视频生成"
  category    ModelCategory?       // 辅助分类（可选）

  // 计费配置
  billingType     BillingType          // TOKEN, CALL, SECOND
  inputPrice      Decimal?  @db.Decimal(10, 6)
  outputPrice     Decimal?  @db.Decimal(10, 6)
  perCallPrice    Decimal?  @db.Decimal(10, 2)

  // 价格管理
  priceSource     PriceSource @default(MANUAL)
  upstreamPrice   Decimal?  @db.Decimal(10, 6)   // 上游价格
  priceMarkup     Decimal?  @db.Decimal(3, 2) @default(1.0)  // 加价倍率

  isActive    Boolean  @default(true)

  @@unique([providerId, modelName])
}

enum ModelCategory {
  CHAT         // 对话
  IMAGE        // 图像
  VIDEO        // 视频
  AUDIO        // 音频
  MUSIC        // 音乐
  EMBEDDING    // 嵌入
}

enum BillingType {
  TOKEN        // 按 Token
  CALL         // 按次
  SECOND       // 按秒
}

enum PriceSource {
  MANUAL       // 手动设置
  AUTO         // 自动同步
  UPSTREAM     // 上游 + 加价
}
```

#### Attachment（附件管理）

```prisma
model Attachment {
  id          String   @id @default(cuid())

  userId      String
  user        User     @relation(...)

  // 文件信息
  filename    String                  // 原始文件名
  fileSize    Int                     // 文件大小（字节）
  mimeType    String                  // MIME 类型

  // 存储信息
  storageType StorageType             // 存储类型
  storagePath String                  // 存储路径
  url         String                  // 访问 URL
  thumbnailUrl String?                // 缩略图 URL（图片）

  // 元数据
  width       Int?                    // 图片宽度
  height      Int?                    // 图片高度
  duration    Int?                    // 视频/音频时长（秒）

  messageId   String?                 // 关联的消息 ID

  uploadStatus String   @default("completed")
  isPublic    Boolean  @default(false)
}
```

### 其他核心表

- **User** - 用户（支持多种登录方式，余额管理，推荐系统）
- **Session** - 会话（JWT Token 管理）
- **Conversation** - 对话（支持分组、置顶、归档）
- **Message** - 消息（Token 统计、成本计算、附件、RAG 引用）
- **UsageLog** - 用量日志（精确的 Token 统计和成本）
- **Transaction** - 交易记录（充值、消费、赠送、退款）
- **KnowledgeBase** - 知识库
- **Document** - 文档
- **DocumentChunk** - 文档分块（pgvector 向量嵌入）
- **Agent** - 智能体
- **SystemConfig** - 系统配置（键值对存储）

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

### 开发工具
- **pnpm** - 包管理器
- **Vitest** - 单元测试（80% 覆盖率目标）
- **Playwright** - E2E 测试
- **ESLint + Prettier** - 代码质量
- **Husky + lint-staged** - Git hooks

---

## 🏗️ 项目结构

```
QingyunAI/
├── packages/               # Monorepo 共享包
│   ├── database/          # 数据库包 ✅
│   │   ├── prisma/
│   │   │   ├── schema.prisma  # 数据库 Schema
│   │   │   └── seed.ts        # 初始化数据
│   │   ├── src/
│   │   │   ├── client.ts      # Prisma Client 单例
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── ai-runtime/        # AI 运行时 🔄
│   │   ├── src/
│   │   │   ├── utils/
│   │   │   │   ├── api-key-pool.ts    # API 密钥轮询 ✅
│   │   │   │   └── encryption.ts      # AES-256 加密 ✅
│   │   │   ├── types/
│   │   │   │   └── index.ts           # 类型定义 ✅
│   │   │   ├── adapters/              # Provider 适配器 ⏳
│   │   │   │   ├── openai-compatible.ts
│   │   │   │   ├── gemini.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── billing/           # 计费系统 ⏳
│   ├── constants/         # 常量定义 ⏳
│   └── types/             # 全局类型 ⏳
│
├── server/                # Nuxt Nitro 服务端 ⏳
│   ├── api/
│   ├── services/
│   ├── middleware/
│   └── jobs/
│
├── app/                   # Nuxt 应用 ⏳
│   ├── components/
│   ├── pages/
│   ├── layouts/
│   └── composables/
│
├── .env                   # 环境变量 ✅
├── .env.example           # 环境变量模板 ✅
├── CLAUDE.md              # 本文档 ✅
├── README.md              # 项目说明 ✅
└── package.json           # 项目配置
```

---

## 🔌 管理后台 API

### Provider 管理

#### 创建 Provider
```http
POST /api/admin/providers
Content-Type: application/json

{
  "name": "openai-official",
  "displayName": "OpenAI 官方",
  "type": "OPENAI",
  "baseUrl": "https://api.openai.com",
  "autoSync": true,
  "syncInterval": 3600,
  "apiKeys": [
    {
      "name": "主密钥",
      "key": "sk-xxxxx",
      "weight": 10,
      "priority": 0,
      "dailyLimit": 1000000
    }
  ]
}
```

#### 获取 Provider 列表
```http
GET /api/admin/providers?type=OPENAI&isActive=true&search=openai
```

**返回示例**：
```json
{
  "success": true,
  "data": [
    {
      "id": "xxx",
      "name": "openai-official",
      "displayName": "OpenAI 官方",
      "type": "OPENAI",
      "isActive": true,
      "stats": {
        "totalKeys": 3,
        "activeKeys": 2,
        "totalModels": 15,
        "activeModels": 12
      }
    }
  ]
}
```

#### 获取单个 Provider
```http
GET /api/admin/providers/:id
```

**返回包含**：
- Provider 基本信息
- 所有 API 密钥列表（不含加密内容）
- 所有模型列表

#### 更新 Provider
```http
PUT /api/admin/providers/:id
Content-Type: application/json

{
  "displayName": "OpenAI 官方 API",
  "isActive": true,
  "autoSync": true
}
```

#### 删除 Provider
```http
DELETE /api/admin/providers/:id
```

**注意**：
- 如果模型已被使用，将禁止删除
- 会级联删除所有关联的 API 密钥和模型

#### 测试连接
```http
POST /api/admin/providers/:id/test
```

#### 同步模型
```http
POST /api/admin/providers/:id/sync
```

**返回示例**：
```json
{
  "success": true,
  "message": "同步完成：新增 5 个，更新 8 个，跳过 2 个",
  "data": {
    "created": 5,
    "updated": 8,
    "skipped": 2,
    "total": 15
  }
}
```

#### 批量同步所有 Provider
```http
POST /api/admin/providers/sync-all
```

---

### API 密钥管理

#### 添加 API 密钥
```http
POST /api/admin/providers/:id/keys
Content-Type: application/json

{
  "name": "备用密钥",
  "key": "sk-xxxxx",
  "weight": 5,
  "priority": 1,
  "dailyLimit": 500000,
  "monthlyLimit": 10000000,
  "isActive": true
}
```

#### 获取密钥列表
```http
GET /api/admin/providers/:id/keys?isActive=true
```

**返回示例**：
```json
{
  "success": true,
  "data": [
    {
      "id": "xxx",
      "name": "主密钥",
      "weight": 10,
      "priority": 0,
      "dailyUsed": 85000,
      "dailyLimit": 1000000,
      "status": "normal",
      "usageRate": {
        "daily": "8.50",
        "monthly": "12.30"
      }
    }
  ],
  "stats": {
    "total": 3,
    "active": 2,
    "available": 2,
    "error": 0
  }
}
```

**密钥状态说明**：
- `normal`: 正常可用
- `disabled`: 已禁用
- `error`: 错误过多（errorCount >= 5）
- `daily_limit`: 达到日限额
- `monthly_limit`: 达到月限额

#### 更新密钥
```http
PUT /api/admin/providers/:id/keys/:keyId
Content-Type: application/json

{
  "name": "主密钥（已升级）",
  "weight": 15,
  "dailyLimit": 2000000,
  "isActive": true
}
```

**注意**：可选传入 `key` 字段更新密钥内容

#### 删除密钥
```http
DELETE /api/admin/providers/:id/keys/:keyId
```

**注意**：不允许删除最后一个可用的密钥

#### 重置用量统计
```http
POST /api/admin/providers/:id/keys/:keyId/reset
Content-Type: application/json

{
  "resetType": "all"  // all | daily | monthly | error
}
```

---

### 模型管理

#### 获取模型列表
```http
GET /api/admin/models?providerId=xxx&category=CHAT&isActive=true&search=gpt
```

**筛选参数**：
- `providerId`: 按 Provider 筛选
- `providerType`: 按 Provider 类型筛选（OPENAI, ANTHROPIC 等）
- `category`: 按类别筛选（CHAT, IMAGE, AUDIO 等）
- `groupName`: 按分组筛选
- `isActive`: 按状态筛选
- `search`: 搜索模型名称或显示名称

**返回示例**：
```json
{
  "success": true,
  "data": {
    "models": [...],
    "grouped": {
      "对话模型": [...],
      "绘图模型": [...]
    }
  },
  "stats": {
    "total": 42,
    "active": 38,
    "byCategory": {
      "CHAT": 25,
      "IMAGE": 10,
      "AUDIO": 7
    },
    "byGroup": {
      "对话模型": 25,
      "绘图模型": 10
    }
  }
}
```

#### 获取单个模型
```http
GET /api/admin/models/:id
```

**返回包含**：
- 模型基本信息
- Provider 信息
- 价格详情（含加价率）
- 使用统计（最近 30 天）

#### 更新模型
```http
PUT /api/admin/models/:id
Content-Type: application/json

{
  "displayName": "GPT-4o（最新）",
  "groupName": "旗舰模型",
  "description": "OpenAI 最新旗舰模型",
  "isActive": true,
  "sortOrder": 1
}
```

#### 更新模型价格
```http
PUT /api/admin/models/:id/pricing
Content-Type: application/json

{
  "priceSource": "MANUAL",
  "billingType": "TOKEN",
  "inputPrice": 0.03,
  "outputPrice": 0.06
}
```

**价格来源类型**：
1. **MANUAL**（手动设置）
   ```json
   {
     "priceSource": "MANUAL",
     "billingType": "TOKEN",
     "inputPrice": 0.03,
     "outputPrice": 0.06
   }
   ```

2. **AUTO**（自动同步）
   ```json
   {
     "priceSource": "AUTO"
   }
   ```
   价格由同步服务自动更新

3. **UPSTREAM**（上游价格 + 加价）
   ```json
   {
     "priceSource": "UPSTREAM",
     "markupRate": 20
   }
   ```
   基于 upstreamPrice 加价 20%

**计费类型**：
- `TOKEN`: 按 Token 计费（inputPrice + outputPrice）
- `PER_CALL`: 按次计费（perCallPrice）

---

## 📝 开发规范

### Git 提交规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型**：
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试
- `chore`: 构建工具

**Scope 范围**：
auth, chat, billing, knowledge, agent, model, admin, ui, db, api

**示例**：
```bash
git commit -m "feat(model): 实现 API 密钥加权轮询机制"
git commit -m "fix(billing): 修复 Token 计数精度问题"
```

### 代码风格

- **TypeScript strict 模式**
- **所有注释使用中文**
- **函数和变量命名使用英文**
- **组件文件名使用 PascalCase**
- **工具函数文件名使用 kebab-case**

### 数据库操作

```bash
# 生成 Prisma Client
pnpm --filter @qingyun/database db:generate

# 创建迁移
pnpm --filter @qingyun/database db:migrate

# 初始化数据
pnpm --filter @qingyun/database db:seed

# 打开 Prisma Studio
pnpm --filter @qingyun/database db:studio
```

---

## 🚀 部署指南

### 环境要求

- Node.js >= 20.x
- pnpm >= 9.x
- PostgreSQL >= 15.x（需启用 pgvector 扩展）
- Redis >= 7.x

### 数据库准备

1. 创建 PostgreSQL 数据库
2. 启用 pgvector 扩展：
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

### 部署步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/zhijun2003/QingyunAI.git
   cd QingyunAI
   ```

2. **安装依赖**
   ```bash
   pnpm install
   ```

3. **配置环境变量**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件
   ```

4. **初始化数据库**
   ```bash
   pnpm --filter @qingyun/database db:generate
   pnpm --filter @qingyun/database db:migrate
   pnpm --filter @qingyun/database db:seed
   ```

5. **启动开发服务器**
   ```bash
   pnpm dev
   ```

6. **构建生产版本**
   ```bash
   pnpm build
   pnpm start
   ```

### 管理员账号

初始管理员账号：
- 用户名：`admin`
- 密码：`admin123456`

⚠️ **请登录后立即修改密码！**

---

## 📚 附录

### 作者信息

- **Author**: zhijun2003
- **Email**: zhijun2003@foxmail.com
- **GitHub**: https://github.com/zhijun2003/QingyunAI

### 许可证

MIT License

---

**清云AI - 让AI触手可及**
