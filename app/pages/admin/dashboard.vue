<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold">数据看板</h2>
      <NSelect v-model:value="days" :options="daysOptions" style="width: 150px" @update:value="loadStats" />
    </div>

    <!-- 概览统计 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <NCard>
        <NStat label="总用户数" :value="stats.overview?.users?.total || 0" />
        <div class="mt-2 text-sm text-gray-500">
          新增: {{ stats.overview?.users?.new || 0 }} | 活跃: {{ stats.overview?.users?.active || 0 }}
        </div>
      </NCard>
      <NCard>
        <NStat label="总充值" :value="`¥${formatAmount(stats.overview?.revenue?.recharge || 0)}`" />
        <div class="mt-2 text-sm text-gray-500">
          {{ stats.overview?.revenue?.rechargeCount || 0 }} 笔
        </div>
      </NCard>
      <NCard>
        <NStat label="总消费" :value="`¥${formatAmount(Math.abs(stats.overview?.revenue?.consumption || 0))}`" />
        <div class="mt-2 text-sm text-gray-500">
          {{ stats.overview?.revenue?.consumptionCount || 0 }} 笔
        </div>
      </NCard>
      <NCard>
        <NStat label="总对话数" :value="stats.overview?.conversations?.total || 0" />
        <div class="mt-2 text-sm text-gray-500">
          消息: {{ stats.overview?.conversations?.messages || 0 }}
        </div>
      </NCard>
    </div>

    <!-- 趋势图表 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <NCard title="用户增长趋势">
        <div ref="userChartRef" style="width: 100%; height: 300px"></div>
      </NCard>
      <NCard title="收入趋势">
        <div ref="revenueChartRef" style="width: 100%; height: 300px"></div>
      </NCard>
    </div>

    <!-- 模型使用统计 -->
    <NCard title="热门模型 Top 10" class="mb-6">
      <NDataTable :columns="modelColumns" :data="stats.modelStats || []" :pagination="false" />
    </NCard>

    <!-- Provider 统计 -->
    <NCard title="Provider 统计">
      <NDataTable :columns="providerColumns" :data="stats.providerStats || []" :pagination="false" />
    </NCard>
  </div>
</template>

<script setup lang="ts">
import { NButton, NCard, NDataTable, NSelect, NStat, type DataTableColumns, useMessage } from 'naive-ui'
import * as echarts from 'echarts'
import type { ECharts } from 'echarts'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const message = useMessage()
const { get } = useApi()

// 状态
const stats = ref<any>({
  overview: null,
  modelStats: [],
  providerStats: [],
  dailyStats: [],
})
const loading = ref(false)
const days = ref(30)

// 图表实例
const userChartRef = ref<HTMLElement>()
const revenueChartRef = ref<HTMLElement>()
let userChart: ECharts | null = null
let revenueChart: ECharts | null = null

// 天数选项
const daysOptions = [
  { label: '最近7天', value: 7 },
  { label: '最近30天', value: 30 },
  { label: '最近90天', value: 90 },
]

// 模型统计列
const modelColumns: DataTableColumns<any> = [
  {
    title: '排名',
    key: 'rank',
    width: 80,
    render: (_, index) => index + 1,
  },
  {
    title: '模型名称',
    key: 'modelName',
  },
  {
    title: 'Provider',
    key: 'providerName',
  },
  {
    title: '调用次数',
    key: 'count',
    sorter: (a, b) => a.count - b.count,
  },
  {
    title: '输入Tokens',
    key: 'inputTokens',
    render: (row) => row.inputTokens?.toLocaleString() || 0,
  },
  {
    title: '输出Tokens',
    key: 'outputTokens',
    render: (row) => row.outputTokens?.toLocaleString() || 0,
  },
  {
    title: '总费用',
    key: 'cost',
    render: (row) => `¥${formatAmount(row.cost || 0)}`,
    sorter: (a, b) => Number(a.cost) - Number(b.cost),
  },
]

// Provider 统计列
const providerColumns: DataTableColumns<any> = [
  {
    title: 'Provider',
    key: 'displayName',
  },
  {
    title: '类型',
    key: 'type',
  },
  {
    title: '状态',
    key: 'isActive',
    render: (row) => (row.isActive ? '✅ 活跃' : '❌ 禁用'),
  },
  {
    title: '模型数',
    key: 'modelsCount',
    render: (row) => row._count?.models || 0,
  },
  {
    title: 'API密钥数',
    key: 'keysCount',
    render: (row) => row._count?.apiKeys || 0,
  },
]

// 格式化金额
function formatAmount(amount: number | string): string {
  const num = Number(amount)
  return num.toFixed(2)
}

// 初始化图表
function initCharts() {
  if (userChartRef.value) {
    userChart = echarts.init(userChartRef.value)
  }
  if (revenueChartRef.value) {
    revenueChart = echarts.init(revenueChartRef.value)
  }
}

// 更新用户图表
function updateUserChart() {
  if (!userChart || !stats.value.dailyStats) return

  const dates = stats.value.dailyStats.map((s: any) => s.date)
  const newUsers = stats.value.dailyStats.map((s: any) => s.newUsers)
  const conversations = stats.value.dailyStats.map((s: any) => s.conversations)

  userChart.setOption({
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: ['新增用户', '对话数'],
    },
    xAxis: {
      type: 'category',
      data: dates,
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name: '新增用户',
        type: 'line',
        data: newUsers,
        smooth: true,
      },
      {
        name: '对话数',
        type: 'line',
        data: conversations,
        smooth: true,
      },
    ],
  })
}

// 更新收入图表
function updateRevenueChart() {
  if (!revenueChart || !stats.value.dailyStats) return

  const dates = stats.value.dailyStats.map((s: any) => s.date)
  const recharge = stats.value.dailyStats.map((s: any) => Number(s.recharge))
  const consumption = stats.value.dailyStats.map((s: any) => Math.abs(Number(s.consumption)))

  revenueChart.setOption({
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: ['充值', '消费'],
    },
    xAxis: {
      type: 'category',
      data: dates,
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name: '充值',
        type: 'bar',
        data: recharge,
      },
      {
        name: '消费',
        type: 'bar',
        data: consumption,
      },
    ],
  })
}

// 加载统计数据
async function loadStats() {
  loading.value = true
  try {
    const response = await get('/api/admin/stats/overview', { days: days.value })
    if (response.success) {
      stats.value = response.data

      // 更新图表
      nextTick(() => {
        updateUserChart()
        updateRevenueChart()
      })
    } else {
      message.error(response.message || '加载失败')
    }
  } catch (error) {
    console.error('Load stats failed:', error)
    message.error('加载失败')
  } finally {
    loading.value = false
  }
}

// 窗口大小变化时重绘图表
function handleResize() {
  userChart?.resize()
  revenueChart?.resize()
}

// 初始化
onMounted(() => {
  initCharts()
  loadStats()
  window.addEventListener('resize', handleResize)
})

// 清理
onUnmounted(() => {
  userChart?.dispose()
  revenueChart?.dispose()
  window.removeEventListener('resize', handleResize)
})
</script>
