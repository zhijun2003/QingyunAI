<template>
  <div class="max-w-6xl mx-auto p-6">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">账户充值</h1>
      <p class="text-gray-600">选择充值套餐或自定义金额，支持支付宝、微信支付</p>
    </div>

    <!-- 充值流程 -->
    <div v-if="!paymentInfo" class="space-y-6">
      <!-- 充值套餐 -->
      <NCard title="充值套餐">
        <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div
            v-for="pkg in packages"
            :key="pkg.id"
            class="border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg"
            :class="{
              'border-primary bg-primary/5': selectedPackage?.id === pkg.id,
              'border-gray-200': selectedPackage?.id !== pkg.id,
            }"
            @click="selectPackage(pkg)"
          >
            <div class="text-center">
              <div class="text-3xl font-bold text-primary mb-2">
                ¥{{ pkg.amount }}
              </div>
              <div v-if="pkg.giveAmount > 0" class="text-sm text-gray-600 mb-2">
                赠送 ¥{{ pkg.giveAmount }}
              </div>
              <div v-if="pkg.name" class="text-xs text-gray-500">
                {{ pkg.name }}
              </div>
            </div>
          </div>
        </div>
      </NCard>

      <!-- 自定义金额 -->
      <NCard v-if="customEnabled" title="自定义金额">
        <div class="flex items-center space-x-4">
          <NInputNumber
            v-model:value="customAmount"
            :min="minAmount"
            :precision="2"
            placeholder="请输入充值金额"
            class="flex-1"
          >
            <template #prefix>¥</template>
          </NInputNumber>
          <NButton @click="selectCustomAmount">使用自定义金额</NButton>
        </div>
        <div class="text-sm text-gray-500 mt-2">
          最低充值金额：¥{{ minAmount }}
        </div>
      </NCard>

      <!-- 支付方式 -->
      <NCard title="支付方式">
        <NRadioGroup v-model:value="paymentMethod">
          <NSpace>
            <NRadio v-if="alipayEnabled" value="alipay">
              <div class="flex items-center space-x-2">
                <Icon name="carbon:logo-alipay" class="text-xl text-blue-500" />
                <span>支付宝</span>
              </div>
            </NRadio>
            <NRadio v-if="wechatEnabled" value="wechat">
              <div class="flex items-center space-x-2">
                <Icon name="carbon:logo-wechat" class="text-xl text-green-500" />
                <span>微信支付</span>
              </div>
            </NRadio>
          </NSpace>
        </NRadioGroup>
      </NCard>

      <!-- 充值信息确认 -->
      <NCard v-if="selectedAmount > 0" title="充值信息">
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-gray-600">充值金额</span>
            <span class="font-semibold">¥{{ selectedAmount.toFixed(2) }}</span>
          </div>
          <div v-if="selectedGiveAmount > 0" class="flex justify-between">
            <span class="text-gray-600">赠送金额</span>
            <span class="font-semibold text-primary">+¥{{ selectedGiveAmount.toFixed(2) }}</span>
          </div>
          <div class="flex justify-between text-lg font-bold border-t pt-3">
            <span>实际到账</span>
            <span class="text-primary">¥{{ (selectedAmount + selectedGiveAmount).toFixed(2) }}</span>
          </div>
        </div>

        <NButton
          type="primary"
          size="large"
          block
          class="mt-6"
          :loading="creating"
          :disabled="!paymentMethod"
          @click="handlePay"
        >
          {{ paymentMethod ? '立即支付' : '请选择支付方式' }}
        </NButton>
      </NCard>
    </div>

    <!-- 支付界面 -->
    <div v-else class="space-y-6">
      <NCard title="扫码支付">
        <div class="text-center">
          <div class="mb-4">
            <div class="text-2xl font-bold text-primary mb-2">
              ¥{{ selectedAmount.toFixed(2) }}
            </div>
            <div class="text-sm text-gray-600">
              订单号：{{ paymentInfo.orderNo }}
            </div>
          </div>

          <!-- PC端显示二维码 -->
          <div v-if="!isMobile && qrCodeUrl" class="flex justify-center mb-4">
            <div class="border-4 border-gray-200 rounded-lg p-4 inline-block">
              <canvas ref="qrCanvas" class="w-64 h-64"></canvas>
            </div>
          </div>

          <!-- 移动端提示 -->
          <div v-if="isMobile" class="mb-4">
            <NAlert type="info">
              <template #icon>
                <Icon name="carbon:information" />
              </template>
              {{ paymentMethod === 'alipay' ? '即将跳转到支付宝' : '即将跳转到微信支付' }}，请完成支付
            </NAlert>
          </div>

          <div class="text-sm text-gray-500 space-y-2">
            <p>{{ paymentMethod === 'alipay' ? '请使用支付宝扫码支付' : '请使用微信扫码支付' }}</p>
            <p class="text-xs">订单将在30分钟后自动关闭</p>
          </div>

          <div class="mt-6 flex justify-center space-x-4">
            <NButton @click="cancelPayment">取消支付</NButton>
            <NButton type="primary" @click="checkOrderStatus">
              <Icon name="carbon:checkmark" class="mr-1" />
              我已完成支付
            </NButton>
          </div>
        </div>
      </NCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  NAlert,
  NButton,
  NCard,
  NInputNumber,
  NRadio,
  NRadioGroup,
  NSpace,
  useMessage,
} from 'naive-ui'
import { Icon } from '#components'
import QRCode from 'qrcode'

definePageMeta({
  layout: 'default',
  middleware: 'auth',
})

const message = useMessage()
const { get, post } = useApi()

// 状态
const packages = ref<any[]>([])
const selectedPackage = ref<any>(null)
const customAmount = ref<number | null>(null)
const customEnabled = ref(true)
const minAmount = ref(1)
const alipayEnabled = ref(false)
const wechatEnabled = ref(false)
const paymentMethod = ref<'alipay' | 'wechat' | null>(null)
const creating = ref(false)
const paymentInfo = ref<any>(null)
const qrCanvas = ref<HTMLCanvasElement | null>(null)
const qrCodeUrl = ref('')

// 检测是否移动端
const isMobile = ref(false)
onMounted(() => {
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
})

// 计算选中的金额
const selectedAmount = computed(() => {
  if (selectedPackage.value) {
    return Number(selectedPackage.value.amount)
  }
  if (customAmount.value) {
    return customAmount.value
  }
  return 0
})

const selectedGiveAmount = computed(() => {
  if (selectedPackage.value) {
    return Number(selectedPackage.value.giveAmount)
  }
  return 0
})

// 选择套餐
function selectPackage(pkg: any) {
  selectedPackage.value = pkg
  customAmount.value = null
}

// 选择自定义金额
function selectCustomAmount() {
  if (!customAmount.value || customAmount.value < minAmount.value) {
    message.warning(`请输入不少于${minAmount.value}元的金额`)
    return
  }
  selectedPackage.value = null
}

// 支付
async function handlePay() {
  if (!paymentMethod.value) {
    message.warning('请选择支付方式')
    return
  }

  if (selectedAmount.value <= 0) {
    message.warning('请选择充值金额')
    return
  }

  creating.value = true
  try {
    // 1. 创建充值订单
    const orderResult = await post('/api/user/recharge/create', {
      packageId: selectedPackage.value?.id,
      amount: selectedPackage.value ? undefined : customAmount.value,
      paymentMethod: paymentMethod.value,
    })

    if (!orderResult.success) {
      message.error(orderResult.message || '创建订单失败')
      return
    }

    const orderNo = orderResult.data.orderNo

    // 2. 创建支付
    const paymentResult = await post(`/api/payment/${paymentMethod.value}/create`, {
      orderNo,
      channel: isMobile.value ? 'mobile' : 'pc',
    })

    if (!paymentResult.success) {
      message.error(paymentResult.message || '创建支付失败')
      return
    }

    paymentInfo.value = paymentResult.data

    // 3. 处理支付界面
    if (isMobile.value) {
      // 移动端：跳转到支付页面
      if (paymentMethod.value === 'alipay') {
        // 支付宝H5支付：直接跳转
        window.location.href = paymentResult.data.paymentUrl
      } else {
        // 微信H5支付：跳转到h5_url
        window.location.href = paymentResult.data.h5Url
      }
    } else {
      // PC端：显示二维码
      if (paymentMethod.value === 'alipay') {
        // 支付宝返回的是form表单，需要特殊处理
        qrCodeUrl.value = paymentResult.data.paymentUrl
        // 将表单写入隐藏的div并提交
        const div = document.createElement('div')
        div.innerHTML = paymentResult.data.paymentUrl
        document.body.appendChild(div)
        const form = div.querySelector('form')
        if (form) {
          form.submit()
        }
      } else {
        // 微信Native支付：生成二维码
        qrCodeUrl.value = paymentResult.data.qrCode
        nextTick(() => {
          if (qrCanvas.value) {
            QRCode.toCanvas(qrCanvas.value, qrCodeUrl.value, {
              width: 256,
              margin: 2,
            })
          }
        })
      }

      // 开始轮询订单状态
      startPolling(orderNo)
    }
  } catch (error) {
    console.error('Payment error:', error)
    message.error('支付失败')
  } finally {
    creating.value = false
  }
}

// 轮询订单状态
let pollingTimer: any = null
function startPolling(orderNo: string) {
  pollingTimer = setInterval(async () => {
    const result = await get(`/api/user/recharge/check/${orderNo}`)
    if (result.success && result.data.status === 'PAID') {
      clearInterval(pollingTimer)
      message.success('支付成功！')
      // 刷新余额并跳转
      setTimeout(() => {
        navigateTo('/transactions')
      }, 1500)
    }
  }, 2000)
}

// 取消支付
function cancelPayment() {
  if (pollingTimer) {
    clearInterval(pollingTimer)
  }
  paymentInfo.value = null
  qrCodeUrl.value = ''
}

// 检查订单状态
async function checkOrderStatus() {
  if (!paymentInfo.value) return

  const result = await get(`/api/user/recharge/check/${paymentInfo.value.orderNo}`)
  if (result.success) {
    if (result.data.status === 'PAID') {
      message.success('支付成功！')
      setTimeout(() => {
        navigateTo('/transactions')
      }, 1500)
    } else {
      message.info('订单尚未支付')
    }
  }
}

// 加载充值套餐
async function loadPackages() {
  try {
    const response = await get('/api/user/recharge/packages')
    if (response.success) {
      packages.value = response.data || []
    }
  } catch (error) {
    console.error('Load packages error:', error)
  }
}

// 加载配置
async function loadConfig() {
  try {
    const response = await get('/api/user/config')
    if (response.success) {
      const config = response.data
      customEnabled.value = config.recharge?.custom_enabled === 'true'
      minAmount.value = Number(config.recharge?.min_amount || 1)
      alipayEnabled.value = config.payment?.alipay_enabled === 'true'
      wechatEnabled.value = config.payment?.wechat_enabled === 'true'

      // 自动选择可用的支付方式
      if (alipayEnabled.value) {
        paymentMethod.value = 'alipay'
      } else if (wechatEnabled.value) {
        paymentMethod.value = 'wechat'
      }
    }
  } catch (error) {
    console.error('Load config error:', error)
  }
}

// 初始化
onMounted(async () => {
  await Promise.all([loadPackages(), loadConfig()])
})

// 清理
onUnmounted(() => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
  }
})
</script>
