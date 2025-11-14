import { prisma } from '@qingyun/database'
import { requireRole } from '~/server/utils/auth'

/**
 * 删除充值套餐（管理员）
 */
export default defineEventHandler(async (event) => {
  try {
    // 验证管理员权限
    const user = await requireRole(event, 'ADMIN')
    if (!user) {
      return {
        success: false,
        message: '无权限',
      }
    }

    // 获取套餐ID
    const id = getRouterParam(event, 'id')
    if (!id) {
      return {
        success: false,
        message: '套餐ID不能为空',
      }
    }

    // 检查套餐是否存在
    const existingPackage = await prisma.rechargePackage.findUnique({
      where: { id },
    })

    if (!existingPackage) {
      return {
        success: false,
        message: '充值套餐不存在',
      }
    }

    // TODO: 可选 - 检查是否有关联的充值订单，如果有则不允许删除

    // 删除充值套餐
    await prisma.rechargePackage.delete({
      where: { id },
    })

    return {
      success: true,
      message: '充值套餐删除成功',
    }
  } catch (error) {
    console.error('Delete recharge package failed:', error)
    return {
      success: false,
      message: '删除充值套餐失败',
    }
  }
})
