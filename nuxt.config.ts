// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  devtools: { enabled: true },

  // Monorepo 别名配置（使用绝对路径）
  alias: {
    '@qingyun/database': resolve(__dirname, './packages/database/src'),
    '@qingyun/ai-runtime': resolve(__dirname, './packages/ai-runtime/src'),
    '@qingyun/billing': resolve(__dirname, './packages/billing/src'),
    '@qingyun/constants': resolve(__dirname, './packages/constants/src'),
    '@qingyun/types': resolve(__dirname, './packages/types/src'),
  },

  // TypeScript 配置（暂时禁用 typeCheck，避免开发时卡顿）
  typescript: {
    strict: true,
    typeCheck: false,  // 改为 false，使用 pnpm typecheck 手动检查
  },

  // 模块
  modules: ['@pinia/nuxt', '@vueuse/nuxt'],

  // 实验性功能
  experimental: {
    componentIslands: true,
    asyncContext: true,
  },

  // Nitro 配置（服务端）
  nitro: {
    preset: 'node-server',
    compressPublicAssets: true,
  },

  // 运行时配置
  runtimeConfig: {
    // 服务端环境变量
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    jwtSecret: process.env.JWT_SECRET,

    // 客户端环境变量
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api',
    },
  },
})
