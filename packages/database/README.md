# @qingyun/database

清云AI 数据库包 - 基于 Prisma ORM 的数据库管理层

## 特性

- ✅ **Provider-Model 两层架构** - 灵活的 AI 提供商和模型管理
- ✅ **API 密钥轮询** - 支持多密钥加权轮询和自动故障转移
- ✅ **自动同步模型** - 定时从提供商拉取最新模型和价格
- ✅ **管理员自定义分组** - 灵活的模型分组管理
- ✅ **精确计费系统** - Token 级别的用量统计和成本计算
- ✅ **知识库 RAG** - 基于 pgvector 的向量检索
- ✅ **智能体系统** - 可配置的 AI 智能体

## 安装

```bash
pnpm install
```

## 环境变量

复制 `.env.example` 到根目录的 `.env`：

```bash
cp .env.example ../../.env
```

编辑 `.env` 并配置数据库连接：

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/qingyun_ai"
```

## 数据库命令

### 生成 Prisma Client

```bash
pnpm db:generate
```

### 创建迁移

```bash
pnpm db:migrate
```

### 应用迁移（生产环境）

```bash
pnpm db:migrate:deploy
```

### 推送 Schema（开发环境快速同步）

```bash
pnpm db:push
```

### 初始化数据（创建管理员账号）

```bash
pnpm db:seed
```

### 打开 Prisma Studio（数据库管理界面）

```bash
pnpm db:studio
```

### 重置数据库

```bash
pnpm db:reset
```

## 数据库架构

### 核心表

#### Provider（API 提供商）
- 管理 AI API 提供商（OpenAI、Gemini、Anthropic 等）
- 支持自动同步模型列表
- 配置同步间隔和状态跟踪

#### ProviderApiKey（API 密钥）
- 一对多关系：一个 Provider 可以有多个密钥
- 支持加权轮询（weight）和优先级（priority）
- 自动错误跟踪和禁用机制
- 每日/每月用量限额

#### Model（模型实例）
- 关联到 Provider
- `groupName` 字段：管理员可自定义分组
- `category` 字段：辅助分类（CHAT、IMAGE、VIDEO 等）
- 价格管理：支持手动、自动、上游+加价
- 模型能力标记（stream、vision、function）

### 用户和认证

#### User（用户）
- 支持多种登录方式（用户名、邮箱、手机、微信）
- 余额管理
- 推荐系统（inviteCode）

#### Session（会话）
- JWT Token 管理
- 设备和 IP 跟踪

### 对话系统

#### Conversation（对话）
- 关联用户和模型
- 支持文件夹分组、置顶、归档

#### Message（消息）
- 存储对话消息
- Token 统计和成本计算
- 支持附件和 RAG 引用

### 计费系统

#### UsageLog（用量日志）
- 记录每次 API 调用的用量
- 精确的 Token 统计和成本计算

#### Transaction（交易记录）
- 充值、消费、赠送、退款等
- 余额变动追踪

### 知识库（RAG）

#### KnowledgeBase（知识库）
- 用户创建的知识库
- 关联嵌入模型

#### Document（文档）
- 上传的文档文件
- 解析状态跟踪

#### DocumentChunk（文档分块）
- 文档切分后的块
- 向量嵌入（使用 pgvector）

### 智能体

#### Agent（智能体）
- 自定义系统提示词
- 关联工具和知识库
- 发布到市场

### 系统配置

#### SystemConfig（系统配置）
- 键值对存储
- 支持分组和类型定义
- 动态配置无需重启

## 使用示例

### 导入 Prisma Client

```typescript
import { prisma } from '@qingyun/database'

// 查询用户
const user = await prisma.user.findUnique({
  where: { id: userId }
})

// 创建对话
const conversation = await prisma.conversation.create({
  data: {
    userId,
    modelId,
    title: '新对话'
  }
})
```

### 导入类型

```typescript
import type { User, Model, Provider } from '@qingyun/database'
```

## 数据库初始化流程

1. **安装依赖**
   ```bash
   pnpm install
   ```

2. **配置环境变量**
   ```bash
   cp .env.example ../../.env
   # 编辑 .env 配置 DATABASE_URL
   ```

3. **生成 Prisma Client**
   ```bash
   pnpm db:generate
   ```

4. **创建数据库并应用迁移**
   ```bash
   pnpm db:migrate
   ```

5. **初始化数据**
   ```bash
   pnpm db:seed
   ```

   这会创建：
   - 管理员账号（admin / admin123456）
   - 系统配置
   - 示例 Provider

6. **启动 Prisma Studio（可选）**
   ```bash
   pnpm db:studio
   ```

## 注意事项

### PostgreSQL 扩展

本项目使用 `pgvector` 扩展进行向量检索，需要在 PostgreSQL 中启用：

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 生产环境

生产环境部署时：

1. 使用 `db:migrate:deploy` 而不是 `db:migrate`
2. 确保 `DATABASE_URL` 使用生产数据库
3. 定期备份数据库
4. 监控数据库性能

## 作者

zhijun2003 <zhijun2003@foxmail.com>

## 许可证

MIT
