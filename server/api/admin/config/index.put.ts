import { prisma } from '@qingyun/database'
import { requireRole } from '~/server/utils/auth'

/**
 * 批量更新系统配置（管理员）
 */
export default defineEventHandler(async (event) => {
  try {
    // 验证管理员权限
    const admin = await requireRole(event, 'ADMIN')
    if (!admin) {
      return {
        success: false,
        message: '无权限',
      }
    }

    // 获取请求体
    const body = await readBody(event)
    const { configs } = body

    if (!Array.isArray(configs) || configs.length === 0) {
      return {
        success: false,
        message: '配置数据无效',
      }
    }

    // 批量更新配置
    await prisma.$transaction(
      configs.map((config: any) =>
        prisma.systemConfig.update({
          where: { key: config.key },
          data: { value: config.value },
        })
      )
    )

    return {
      success: true,
      message: '配置更新成功',
    }
  } catch (error) {
    console.error('Update system configs failed:', error)
    return {
      success: false,
      message: '更新配置失败',
    }
  }
})
