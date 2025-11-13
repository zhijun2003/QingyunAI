// ==========================================
// 清云AI - Database Seed
// ==========================================
//
// 初始化数据库数据
// - 创建管理员账号
// - 系统配置
// - 示例数据（可选）
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { PrismaClient } from '@prisma/client'
import * as crypto from 'crypto'

const prisma = new PrismaClient()

// 生成随机邀请码
function generateInviteCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase()
}

// 哈希密码（使用 bcrypt 的简化版本，生产环境应使用 bcrypt）
function hashPassword(password: string): string {
  return crypto
    .createHash('sha256')
    .update(password + process.env.JWT_SECRET || 'default-salt')
    .digest('hex')
}

async function main() {
  console.log('🌱 开始初始化数据库...')

  // ==========================================
  // 1. 创建管理员账号
  // ==========================================
  console.log('📝 创建管理员账号...')

  const adminInviteCode = generateInviteCode()

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@qingyun-ai.com',
      passwordHash: hashPassword('admin123456'),
      nickname: '系统管理员',
      emailVerified: true,
      balance: 0,
      inviteCode: adminInviteCode,
    },
  })

  console.log(`✅ 管理员账号创建成功: ${admin.username}`)
  console.log(`   邮箱: ${admin.email}`)
  console.log(`   初始密码: admin123456`)
  console.log(`   ⚠️  请登录后立即修改密码！`)

  // ==========================================
  // 2. 系统配置
  // ==========================================
  console.log('\n⚙️  初始化系统配置...')

  const configs = [
    // 注册设置
    {
      key: 'register.enabled',
      value: 'true',
      description: '是否允许用户注册',
      group: 'auth',
      valueType: 'boolean',
    },
    {
      key: 'register.gift_amount',
      value: '5.00',
      description: '注册赠送金额（元）',
      group: 'billing',
      valueType: 'number',
    },

    // 登录方式
    {
      key: 'login.username.enabled',
      value: 'true',
      description: '启用用户名密码登录',
      group: 'auth',
      valueType: 'boolean',
    },
    {
      key: 'login.email.enabled',
      value: 'true',
      description: '启用邮箱验证码登录',
      group: 'auth',
      valueType: 'boolean',
    },
    {
      key: 'login.phone.enabled',
      value: 'false',
      description: '启用手机验证码登录',
      group: 'auth',
      valueType: 'boolean',
    },
    {
      key: 'login.wechat.enabled',
      value: 'false',
      description: '启用微信扫码登录',
      group: 'auth',
      valueType: 'boolean',
    },

    // 签到设置
    {
      key: 'signin.enabled',
      value: 'true',
      description: '启用每日签到',
      group: 'billing',
      valueType: 'boolean',
    },
    {
      key: 'signin.gift_amount',
      value: '0.50',
      description: '签到赠送金额（元）',
      group: 'billing',
      valueType: 'number',
    },

    // 推荐设置
    {
      key: 'referral.enabled',
      value: 'true',
      description: '启用推荐奖励',
      group: 'billing',
      valueType: 'boolean',
    },
    {
      key: 'referral.gift_amount',
      value: '10.00',
      description: '推荐奖励金额（元）',
      group: 'billing',
      valueType: 'number',
    },

    // 功能开关
    {
      key: 'feature.chat.enabled',
      value: 'true',
      description: '启用对话功能',
      group: 'features',
      valueType: 'boolean',
    },
    {
      key: 'feature.image.enabled',
      value: 'true',
      description: '启用图像生成',
      group: 'features',
      valueType: 'boolean',
    },
    {
      key: 'feature.knowledge.enabled',
      value: 'true',
      description: '启用知识库',
      group: 'features',
      valueType: 'boolean',
    },
    {
      key: 'feature.agent.enabled',
      value: 'true',
      description: '启用智能体',
      group: 'features',
      valueType: 'boolean',
    },

    // 系统信息
    {
      key: 'site.name',
      value: '清云AI',
      description: '网站名称',
      group: 'general',
      valueType: 'string',
    },
    {
      key: 'site.description',
      value: 'AI一站式助手平台',
      description: '网站描述',
      group: 'general',
      valueType: 'string',
    },

    // 存储配置
    {
      key: 'storage.default_type',
      value: 'LOCAL',
      description: '默认存储类型（LOCAL, MINIO, COS, OSS, S3, IMGBED）',
      group: 'storage',
      valueType: 'string',
    },
    {
      key: 'storage.max_file_size',
      value: '10485760',
      description: '最大文件大小（字节，默认 10MB）',
      group: 'storage',
      valueType: 'number',
    },
    {
      key: 'storage.allowed_types',
      value: 'image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain',
      description: '允许的文件类型（MIME 类型，逗号分隔）',
      group: 'storage',
      valueType: 'string',
    },

    // 本地存储
    {
      key: 'storage.local.enabled',
      value: 'true',
      description: '启用本地存储',
      group: 'storage',
      valueType: 'boolean',
    },
    {
      key: 'storage.local.path',
      value: './uploads',
      description: '本地存储路径',
      group: 'storage',
      valueType: 'string',
    },

    // MinIO 配置
    {
      key: 'storage.minio.enabled',
      value: 'false',
      description: '启用 MinIO 存储',
      group: 'storage',
      valueType: 'boolean',
    },

    // 腾讯云 COS 配置
    {
      key: 'storage.cos.enabled',
      value: 'false',
      description: '启用腾讯云 COS 存储',
      group: 'storage',
      valueType: 'boolean',
    },

    // 阿里云 OSS 配置
    {
      key: 'storage.oss.enabled',
      value: 'false',
      description: '启用阿里云 OSS 存储',
      group: 'storage',
      valueType: 'boolean',
    },

    // 图床配置
    {
      key: 'storage.imgbed.enabled',
      value: 'false',
      description: '启用免费图床（仅限图片）',
      group: 'storage',
      valueType: 'boolean',
    },
    {
      key: 'storage.imgbed.api_url',
      value: 'https://img.scdn.io',
      description: '图床 API 地址',
      group: 'storage',
      valueType: 'string',
    },
  ]

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    })
  }

  console.log(`✅ 系统配置初始化完成（${configs.length} 项）`)

  // ==========================================
  // 3. 示例 Provider（可选）
  // ==========================================
  console.log('\n🔌 创建示例 Provider...')

  // OpenAI 官方（需要用户自己配置密钥）
  await prisma.provider.upsert({
    where: { name: 'openai-official' },
    update: {},
    create: {
      name: 'openai-official',
      displayName: 'OpenAI 官方',
      description: 'OpenAI 官方 API',
      type: 'OPENAI',
      baseUrl: 'https://api.openai.com',
      autoSync: false,
      isActive: false, // 默认禁用，等待配置密钥
    },
  })

  console.log('✅ 示例 Provider 创建完成')

  // ==========================================
  // 完成
  // ==========================================
  console.log('\n✨ 数据库初始化完成！')
  console.log('\n下一步：')
  console.log('1. 使用以下命令生成 Prisma Client:')
  console.log('   pnpm --filter @qingyun/database db:generate')
  console.log('\n2. 启动开发服务器:')
  console.log('   pnpm dev')
  console.log('\n3. 访问管理后台配置 AI 模型和 API 密钥')
  console.log('   默认管理员: admin / admin123456')
}

main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
