// ==========================================
// Prisma Client Singleton
// ==========================================
//
// 创建全局唯一的 Prisma 客户端实例
// 避免在开发环境中重复创建连接
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
