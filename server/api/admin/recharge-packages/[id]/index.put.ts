import { prisma } from '@qingyun/database'
import { requireRole } from '~/server/utils/auth'

/**
 * 更新充值套餐（管理员）
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

    // 获取请求体
    const body = await readBody(event)
    const { name, description, amount, giveAmount, sort, isActive, isHot, isRecommend } = body

    // 构建更新数据
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (amount !== undefined) {
      if (Number(amount) <= 0) {
        return {
          success: false,
          message: '充值金额必须大于0',
        }
      }
      updateData.amount = amount
    }
    if (giveAmount !== undefined) updateData.giveAmount = giveAmount
    if (sort !== undefined) updateData.sort = sort
    if (isActive !== undefined) updateData.isActive = isActive
    if (isHot !== undefined) updateData.isHot = isHot
    if (isRecommend !== undefined) updateData.isRecommend = isRecommend

    // 更新充值套餐
    const rechargePackage = await prisma.rechargePackage.update({
      where: { id },
      data: updateData,
    })

    return {
      success: true,
      data: rechargePackage,
      message: '充值套餐更新成功',
    }
  } catch (error) {
    console.error('Update recharge package failed:', error)
    return {
      success: false,
      message: '更新充值套餐失败',
    }
  }
})
