<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="max-w-7xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">用量统计</h1>
        <NButton @click="navigateTo('/')">返回首页</NButton>
      </div>

      <!-- 统计卡片 -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <NCard>
          <div class="text-center">
            <div class="text-sm text-gray-500 mb-2">总调用次数</div>
            <div class="text-2xl font-bold">{{ stats.totalCount }}</div>
          </div>
        </NCard>
        <NCard>
          <div class="text-center">
            <div class="text-sm text-gray-500 mb-2">总输入Tokens</div>
            <div class="text-2xl font-bold text-blue-600">
              {{ formatNumber(stats.inputTokens) }}
            </div>
          </div>
        </NCard>
        <NCard>
          <div class="text-center">
            <div class="text-sm text-gray-500 mb-2">总输出Tokens</div>
            <div class="text-2xl font-bold text-green-600">
              {{ formatNumber(stats.outputTokens) }}
            </div>
          </div>
        </NCard>
        <NCard>
          <div class="text-center">
            <div class="text-sm text-gray-500 mb-2">总费用</div>
            <div class="text-2xl font-bold text-red-600">
              ¥{{ formatAmount(stats.totalCost) }}
            </div>
          </div>
        </NCard>
      </div>

      <!-- 模型使用统计 -->
      <NCard title="模型使用统计" class="mb-6">
        <NDataTable :columns="modelStatsColumns" :data="stats.byModel || []" :pagination="false" />
      </NCard>

      <!-- 筛选器 -->
      <NCard class="mb-6">
        <NSpace>
          <NSelect
            v-model:value="filter.modelId"
            :options="modelOptions"
            placeholder="选择模型"
            style="width: 300px"
            clearable
            filterable
            @update:value="loadUsageLogs"
          />
          <NDatePicker
            v-model:value="filter.dateRange"
            type="daterange"
            clearable
            @update:value="loadUsageLogs"
          />
          <NButton type="primary" @click="loadUsageLogs">查询</NButton>
          <NButton @click="handleReset">重置</NButton>
        </NSpace>
      </NCard>

      <!-- 用量日志列表 -->
      <NCard title="用量详情">
        <NDataTable
          :columns="columns"
          :data="usageLogs"
          :loading="loading"
          :pagination="paginationProps"
          @update:page="handlePageChange"
          @update:page-size="handlePageSizeChange"
        />
      </NCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  NButton,
  NCard,
  NDataTable,
  NDatePicker,
  NSelect,
  NSpace,
  type DataTableColumns,
  type PaginationProps,
  useMessage,
} from 'naive-ui'

definePageMeta({
  middleware: 'auth',
})

const message = useMessage()
const { get } = useApi()

// 状态
const usageLogs = ref<any[]>([])
const stats = ref<any>({
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  totalCost: 0,
  totalCount: 0,
  byModel: [],
})
const loading = ref(false)
const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0,
})

// 筛选器
const filter = reactive({
  modelId: null as string | null,
  dateRange: null as [number, number] | null,
})

// 模型选项
const modelOptions = ref<Array<{ label: string; value: string }>>([])

// 模型统计列
const modelStatsColumns: DataTableColumns<any> = [
  {
    title: '模型名称',
    key: 'modelName',
  },
  {
    title: '提供商',
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
    render: (row) => formatNumber(row.inputTokens),
    sorter: (a, b) => a.inputTokens - b.inputTokens,
  },
  {
    title: '输出Tokens',
    key: 'outputTokens',
    render: (row) => formatNumber(row.outputTokens),
    sorter: (a, b) => a.outputTokens - b.outputTokens,
  },
  {
    title: '总Tokens',
    key: 'totalTokens',
    render: (row) => formatNumber(row.totalTokens),
    sorter: (a, b) => a.totalTokens - b.totalTokens,
  },
  {
    title: '总费用',
    key: 'totalCost',
    render: (row) => `¥${formatAmount(row.totalCost)}`,
    sorter: (a, b) => Number(a.totalCost) - Number(b.totalCost),
  },
]

// 用量日志列
const columns: DataTableColumns<any> = [
  {
    title: '模型',
    key: 'model',
    width: 200,
    render(row) {
      return `${row.model?.displayName || '未知'} (${row.model?.provider?.displayName || ''})`
    },
  },
  {
    title: '输入Tokens',
    key: 'inputTokens',
    width: 120,
    render(row) {
      return formatNumber(row.inputTokens)
    },
  },
  {
    title: '输出Tokens',
    key: 'outputTokens',
    width: 120,
    render(row) {
      return formatNumber(row.outputTokens)
    },
  },
  {
    title: '总Tokens',
    key: 'totalTokens',
    width: 120,
    render(row) {
      return formatNumber(row.totalTokens)
    },
  },
  {
    title: '输入费用',
    key: 'inputCost',
    width: 100,
    render(row) {
      return `¥${formatAmount(row.inputCost)}`
    },
  },
  {
    title: '输出费用',
    key: 'outputCost',
    width: 100,
    render(row) {
      return `¥${formatAmount(row.outputCost)}`
    },
  },
  {
    title: '总费用',
    key: 'totalCost',
    width: 100,
    render(row) {
      return `¥${formatAmount(row.totalCost)}`
    },
  },
  {
    title: '时间',
    key: 'createdAt',
    width: 180,
    render(row) {
      return new Date(row.createdAt).toLocaleString('zh-CN')
    },
  },
]

// 分页配置
const paginationProps = computed<PaginationProps>(() => ({
  page: pagination.value.page,
  pageSize: pagination.value.pageSize,
  pageCount: Math.ceil(pagination.value.total / pagination.value.pageSize),
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  onChange: handlePageChange,
  onUpdatePageSize: handlePageSizeChange,
}))

// 格式化金额
function formatAmount(amount: number | string): string {
  const num = Number(amount)
  return num.toFixed(4)
}

// 格式化数字
function formatNumber(num: number): string {
  return num.toLocaleString()
}

// 加载用量日志
async function loadUsageLogs() {
  loading.value = true
  try {
    const query: any = {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
    }

    if (filter.modelId) {
      query.modelId = filter.modelId
    }

    if (filter.dateRange) {
      query.startDate = new Date(filter.dateRange[0]).toISOString()
      query.endDate = new Date(filter.dateRange[1]).toISOString()
    }

    const response = await get('/api/user/usage-logs', query)
    if (response.success) {
      usageLogs.value = response.data.usageLogs
      pagination.value.total = response.data.pagination.total
      stats.value = response.data.stats

      // 更新模型选项
      if (response.data.stats.byModel && response.data.stats.byModel.length > 0) {
        modelOptions.value = response.data.stats.byModel.map((m: any) => ({
          label: `${m.modelName} (${m.providerName})`,
          value: m.modelId,
        }))
      }
    } else {
      message.error(response.message || '加载失败')
    }
  } catch (error) {
    console.error('Load usage logs failed:', error)
    message.error('加载失败')
  } finally {
    loading.value = false
  }
}

// 页码变化
function handlePageChange(page: number) {
  pagination.value.page = page
  loadUsageLogs()
}

// 每页数量变化
function handlePageSizeChange(pageSize: number) {
  pagination.value.pageSize = pageSize
  pagination.value.page = 1
  loadUsageLogs()
}

// 重置筛选
function handleReset() {
  filter.modelId = null
  filter.dateRange = null
  pagination.value.page = 1
  loadUsageLogs()
}

// 初始化
onMounted(() => {
  loadUsageLogs()
})
</script>
