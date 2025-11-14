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
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// 生成随机邀请码
function generateInviteCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase()
}

// 哈希密码（使用 bcrypt）
async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10)
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
      passwordHash: await hashPassword('admin123456'),
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

    // 签到配置
    {
      key: 'checkin.enabled',
      value: 'true',
      description: '启用每日签到',
      group: 'checkin',
      valueType: 'boolean',
    },
    {
      key: 'checkin.base_reward',
      value: '50',
      description: '基础签到奖励（分）',
      group: 'checkin',
      valueType: 'number',
    },
    {
      key: 'checkin.continuous_3_bonus',
      value: '10',
      description: '连续签到3天额外奖励（分）',
      group: 'checkin',
      valueType: 'number',
    },
    {
      key: 'checkin.continuous_7_bonus',
      value: '50',
      description: '连续签到7天额外奖励（分）',
      group: 'checkin',
      valueType: 'number',
    },
    {
      key: 'checkin.continuous_30_bonus',
      value: '200',
      description: '连续签到30天额外奖励（分）',
      group: 'checkin',
      valueType: 'number',
    },

    // 充值配置
    {
      key: 'recharge.min_amount',
      value: '1',
      description: '最低充值金额（元）',
      group: 'recharge',
      valueType: 'number',
    },
    {
      key: 'recharge.custom_enabled',
      value: 'true',
      description: '是否允许自定义充值金额',
      group: 'recharge',
      valueType: 'boolean',
    },

    // 支付宝配置
    {
      key: 'payment.alipay.enabled',
      value: 'false',
      description: '启用支付宝支付',
      group: 'payment',
      valueType: 'boolean',
    },
    {
      key: 'payment.alipay.app_id',
      value: '',
      description: '支付宝应用ID',
      group: 'payment',
      valueType: 'string',
    },
    {
      key: 'payment.alipay.private_key',
      value: '',
      description: '支付宝应用私钥',
      group: 'payment',
      valueType: 'string',
    },
    {
      key: 'payment.alipay.public_key',
      value: '',
      description: '支付宝公钥',
      group: 'payment',
      valueType: 'string',
    },
    {
      key: 'payment.alipay.gateway',
      value: 'https://openapi.alipay.com/gateway.do',
      description: '支付宝网关地址',
      group: 'payment',
      valueType: 'string',
    },

    // 微信支付配置
    {
      key: 'payment.wechat.enabled',
      value: 'false',
      description: '启用微信支付',
      group: 'payment',
      valueType: 'boolean',
    },
    {
      key: 'payment.wechat.mch_id',
      value: '',
      description: '微信支付商户号',
      group: 'payment',
      valueType: 'string',
    },
    {
      key: 'payment.wechat.api_key',
      value: '',
      description: '微信支付API密钥',
      group: 'payment',
      valueType: 'string',
    },
    {
      key: 'payment.wechat.app_id',
      value: '',
      description: '微信公众号/小程序APPID',
      group: 'payment',
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
  // 4. 初始化应用插件
  // ==========================================
  console.log('\n📱 初始化应用中心...')

  const applications = [
    // 核心应用（不可禁用）
    {
      key: 'ai-chat',
      name: 'AI对话',
      displayName: 'AI对话',
      description: '与各种AI模型进行智能对话交流',
      icon: 'carbon:chat',
      category: 'CHAT' as const,
      type: 'BUILTIN' as const,
      routePath: '/',
      menuLabel: 'AI对话',
      menuIcon: 'carbon:chat',
      sortOrder: 0,
      isEnabled: true,
      isVisible: true,
      isCore: true,
      requiredRole: 'USER' as const,
    },
    {
      key: 'ai-agent',
      name: '智能体',
      displayName: '智能体',
      description: '创建和使用AI智能体，执行专业任务',
      icon: 'carbon:bot',
      category: 'AGENT' as const,
      type: 'BUILTIN' as const,
      routePath: '/agents',
      menuLabel: '智能体',
      menuIcon: 'carbon:bot',
      sortOrder: 1,
      isEnabled: true,
      isVisible: true,
      isCore: true,
      requiredRole: 'USER' as const,
    },

    // 生成类应用（可由管理员控制）
    {
      key: 'image-generation',
      name: '图像生成',
      displayName: '图像生成',
      description: '使用AI生成各种风格的图片',
      icon: 'carbon:image',
      category: 'GENERATION' as const,
      type: 'BUILTIN' as const,
      routePath: '/apps/image-generation',
      menuLabel: '图像生成',
      menuIcon: 'carbon:image',
      sortOrder: 10,
      isEnabled: false,
      isVisible: true,
      isCore: false,
      requiredRole: 'USER' as const,
      tags: ['AI绘图', '图片', 'Midjourney', 'DALL-E'],
    },
    {
      key: 'video-generation',
      name: '视频生成',
      displayName: '视频生成',
      description: 'AI视频生成工具，支持多种视频创作',
      icon: 'carbon:video',
      category: 'GENERATION' as const,
      type: 'BUILTIN' as const,
      routePath: '/apps/video-generation',
      menuLabel: '视频生成',
      menuIcon: 'carbon:video',
      sortOrder: 11,
      isEnabled: false,
      isVisible: true,
      isCore: false,
      requiredRole: 'USER' as const,
      tags: ['Sora', 'Runway', '可灵', '视频创作'],
    },
    {
      key: 'music-generation',
      name: '音乐生成',
      displayName: '音乐生成',
      description: 'AI音乐创作，生成各种风格的音乐',
      icon: 'carbon:music',
      category: 'GENERATION' as const,
      type: 'BUILTIN' as const,
      routePath: '/apps/music-generation',
      menuLabel: '音乐生成',
      menuIcon: 'carbon:music',
      sortOrder: 12,
      isEnabled: false,
      isVisible: true,
      isCore: false,
      requiredRole: 'USER' as const,
      tags: ['Suno', '音乐创作', 'AI作曲'],
    },
    {
      key: 'ppt-generation',
      name: 'PPT生成',
      displayName: 'PPT生成',
      description: 'AI自动生成精美的PPT演示文稿',
      icon: 'carbon:presentation-file',
      category: 'GENERATION' as const,
      type: 'BUILTIN' as const,
      routePath: '/apps/ppt-generation',
      menuLabel: 'PPT生成',
      menuIcon: 'carbon:presentation-file',
      sortOrder: 13,
      isEnabled: false,
      isVisible: true,
      isCore: false,
      requiredRole: 'USER' as const,
      tags: ['演示', 'PowerPoint', '办公'],
    },

    // 知识管理类
    {
      key: 'knowledge-base',
      name: '知识库',
      displayName: '知识库',
      description: '创建和管理个人知识库，进行RAG问答',
      icon: 'carbon:book',
      category: 'KNOWLEDGE' as const,
      type: 'BUILTIN' as const,
      routePath: '/knowledge',
      menuLabel: '知识库',
      menuIcon: 'carbon:book',
      sortOrder: 20,
      isEnabled: false,
      isVisible: true,
      isCore: false,
      requiredRole: 'USER' as const,
      tags: ['RAG', '文档问答', '知识管理'],
    },

    // 生产力工具类
    {
      key: 'document-parsing',
      name: '文档解析',
      displayName: '文档解析',
      description: '解析和分析各种文档格式（PDF、Word等）',
      icon: 'carbon:document',
      category: 'PRODUCTIVITY' as const,
      type: 'BUILTIN' as const,
      routePath: '/apps/document-parsing',
      menuLabel: '文档解析',
      menuIcon: 'carbon:document',
      sortOrder: 30,
      isEnabled: false,
      isVisible: true,
      isCore: false,
      requiredRole: 'USER' as const,
      tags: ['PDF', 'Word', '文档分析'],
    },
    {
      key: 'web-parsing',
      name: '网页解析',
      displayName: '网页解析',
      description: '解析和提取网页内容',
      icon: 'carbon:catalog',
      category: 'PRODUCTIVITY' as const,
      type: 'BUILTIN' as const,
      routePath: '/apps/web-parsing',
      menuLabel: '网页解析',
      menuIcon: 'carbon:catalog',
      sortOrder: 31,
      isEnabled: false,
      isVisible: true,
      isCore: false,
      requiredRole: 'USER' as const,
      tags: ['爬虫', '网页提取', '内容分析'],
    },
    {
      key: 'mindmap',
      name: '思维导图',
      displayName: '思维导图',
      description: 'AI辅助创建思维导图，整理思路',
      icon: 'carbon:tree-view',
      category: 'PRODUCTIVITY' as const,
      type: 'BUILTIN' as const,
      routePath: '/apps/mindmap',
      menuLabel: '思维导图',
      menuIcon: 'carbon:tree-view',
      sortOrder: 32,
      isEnabled: false,
      isVisible: true,
      isCore: false,
      requiredRole: 'USER' as const,
      tags: ['思维整理', '可视化', '脑图'],
    },
    {
      key: 'qr-code',
      name: '二维码生成',
      displayName: '二维码生成',
      description: '生成各种样式的二维码',
      icon: 'carbon:qr-code',
      category: 'PRODUCTIVITY' as const,
      type: 'BUILTIN' as const,
      routePath: '/apps/qr-code',
      menuLabel: '二维码',
      menuIcon: 'carbon:qr-code',
      sortOrder: 33,
      isEnabled: false,
      isVisible: true,
      isCore: false,
      requiredRole: 'USER' as const,
      tags: ['二维码', '工具'],
    },

    // 分析类
    {
      key: 'voice-tts',
      name: '语音合成',
      displayName: '语音合成',
      description: 'AI文字转语音，多种音色选择',
      icon: 'carbon:microphone',
      category: 'ANALYSIS' as const,
      type: 'BUILTIN' as const,
      routePath: '/apps/voice-tts',
      menuLabel: '语音合成',
      menuIcon: 'carbon:microphone',
      sortOrder: 40,
      isEnabled: false,
      isVisible: true,
      isCore: false,
      requiredRole: 'USER' as const,
      tags: ['TTS', '配音', '语音'],
    },
  ]

  for (const app of applications) {
    await prisma.application.upsert({
      where: { key: app.key },
      update: {},
      create: app,
    })
  }

  console.log(`✅ 应用中心初始化完成（${applications.length} 个应用）`)

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
