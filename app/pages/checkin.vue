<template>
  <div class="max-w-4xl mx-auto p-6">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">每日签到</h1>
      <p class="text-gray-600">坚持签到，领取每日奖励</p>
    </div>

    <!-- 签到状态卡片 -->
    <NCard class="mb-6">
      <div class="text-center py-8">
        <div class="mb-6">
          <div class="text-6xl mb-4">📅</div>
          <h2 class="text-2xl font-bold mb-2">
            {{ status.hasCheckedInToday ? '今日已签到' : '今日未签到' }}
          </h2>
          <p v-if="!status.hasCheckedInToday" class="text-gray-600">
            点击下方按钮完成签到
          </p>
        </div>

        <!-- 签到按钮 -->
        <NButton
          type="primary"
          size="large"
          :disabled="status.hasCheckedInToday || checking"
          :loading="checking"
          @click="handleCheckIn"
        >
          {{ status.hasCheckedInToday ? '已签到' : '立即签到' }}
        </NButton>

        <!-- 连续签到天数 -->
        <div class="mt-8 grid grid-cols-3 gap-4">
          <div class="text-center">
            <div class="text-3xl font-bold text-primary">{{ status.continuous }}</div>
            <div class="text-sm text-gray-600 mt-1">连续签到（天）</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-blue-600">{{ status.monthlyCount }}</div>
            <div class="text-sm text-gray-600 mt-1">本月签到（天）</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-purple-600">{{ status.totalCount }}</div>
            <div class="text-sm text-gray-600 mt-1">累计签到（天）</div>
          </div>
        </div>
      </div>
    </NCard>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- 奖励规则 -->
      <NCard title="奖励规则">
        <div class="space-y-3">
          <div class="flex items-center space-x-3">
            <div class="w-2 h-2 bg-primary rounded-full"></div>
            <div class="flex-1">
              <div class="font-semibold">基础奖励</div>
              <div class="text-sm text-gray-600">每日签到可获得 0.5 元</div>
            </div>
          </div>
          <div class="flex items-center space-x-3">
            <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
            <div class="flex-1">
              <div class="font-semibold">连续签到 3 天</div>
              <div class="text-sm text-gray-600">额外获得 0.1 元</div>
            </div>
          </div>
          <div class="flex items-center space-x-3">
            <div class="w-2 h-2 bg-purple-500 rounded-full"></div>
            <div class="flex-1">
              <div class="font-semibold">连续签到 7 天</div>
              <div class="text-sm text-gray-600">额外获得 0.5 元</div>
            </div>
          </div>
          <div class="flex items-center space-x-3">
            <div class="w-2 h-2 bg-red-500 rounded-full"></div>
            <div class="flex-1">
              <div class="font-semibold">连续签到 30 天</div>
              <div class="text-sm text-gray-600">额外获得 2 元</div>
            </div>
          </div>
          <NAlert type="info" :bordered="false" class="mt-4">
            <template #icon>
              <Icon name="carbon:information" />
            </template>
            断签后连续天数将重置，请坚持每日签到！
          </NAlert>
        </div>
      </NCard>

      <!-- 签到日历 -->
      <NCard title="本月签到记录">
        <div v-if="history.checkins.length > 0" class="space-y-2">
          <div
            v-for="item in history.checkins.slice(0, 10)"
            :key="item.date"
            class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
          >
            <div class="flex items-center space-x-3">
              <Icon name="carbon:checkmark-filled" class="text-green-500" />
              <span>{{ formatDate(item.date) }}</span>
            </div>
            <div class="text-right">
              <div class="font-semibold text-primary">+¥{{ (item.reward / 100).toFixed(2) }}</div>
              <div class="text-xs text-gray-500">连续{{ item.continuous }}天</div>
            </div>
          </div>
        </div>
        <NEmpty v-else description="本月暂无签到记录" />
      </NCard>
    </div>

    <!-- 签到统计 -->
    <NCard title="签到统计">
      <div class="grid grid-cols-3 gap-4 text-center">
        <div>
          <div class="text-sm text-gray-600 mb-1">本月签到</div>
          <div class="text-2xl font-bold">{{ history.stats.count }} 天</div>
        </div>
        <div>
          <div class="text-sm text-gray-600 mb-1">本月奖励</div>
          <div class="text-2xl font-bold text-primary">¥{{ (history.stats.totalReward / 100).toFixed(2) }}</div>
        </div>
        <div>
          <div class="text-sm text-gray-600 mb-1">最长连续</div>
          <div class="text-2xl font-bold text-purple-600">{{ history.stats.maxContinuous }} 天</div>
        </div>
      </div>
    </NCard>
  </div>
</template>

<script setup lang="ts">
import {
  NAlert,
  NButton,
  NCard,
  NEmpty,
  useMessage,
} from 'naive-ui'
import { Icon } from '#components'

definePageMeta({
  layout: 'default',
  middleware: 'auth',
})

const message = useMessage()
const { get, post } = useApi()

// 状态
const checking = ref(false)
const status = ref({
  hasCheckedInToday: false,
  continuous: 0,
  monthlyCount: 0,
  totalCount: 0,
  lastCheckInDate: null as Date | null,
  lastReward: 0,
})

const history = ref({
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  checkins: [] as any[],
  stats: {
    count: 0,
    totalReward: 0,
    maxContinuous: 0,
  },
})

// 格式化日期
function formatDate(date: Date | string): string {
  const d = new Date(date)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${month}月${day}日`
}

// 签到
async function handleCheckIn() {
  if (checking.value) return

  checking.value = true
  try {
    const response = await post('/api/user/checkin', {})
    if (response.success) {
      message.success(response.message)
      // 刷新状态
      await Promise.all([loadStatus(), loadHistory()])
    } else {
      message.error(response.message || '签到失败')
    }
  } catch (error) {
    console.error('Check-in error:', error)
    message.error('签到失败')
  } finally {
    checking.value = false
  }
}

// 加载签到状态
async function loadStatus() {
  try {
    const response = await get('/api/user/checkin/status')
    if (response.success) {
      status.value = response.data
    }
  } catch (error) {
    console.error('Load status error:', error)
  }
}

// 加载签到历史
async function loadHistory() {
  try {
    const response = await get('/api/user/checkin/history', {
      params: {
        year: history.value.year,
        month: history.value.month,
      },
    })
    if (response.success) {
      history.value = response.data
    }
  } catch (error) {
    console.error('Load history error:', error)
  }
}

// 初始化
onMounted(async () => {
  await Promise.all([loadStatus(), loadHistory()])
})
</script>
