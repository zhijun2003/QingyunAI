// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  devtools: { enabled: true },

  // Monorepo 别名配置
  alias: {
    '@qingyun/database': '../packages/database/src',
    '@qingyun/ai-runtime': '../packages/ai-runtime/src',
    '@qingyun/billing': '../packages/billing/src',
    '@qingyun/constants': '../packages/constants/src',
    '@qingyun/types': '../packages/types/src',
  },

  // TypeScript 配置
  typescript: {
    strict: true,
    typeCheck: true,
  },

  // 模块
  modules: [],

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
