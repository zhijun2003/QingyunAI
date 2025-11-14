<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="max-w-7xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">交易记录</h1>
        <NButton @click="navigateTo('/')">返回首页</NButton>
      </div>

      <!-- 统计卡片 -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <NCard>
          <div class="text-center">
            <div class="text-sm text-gray-500 mb-2">总交易次数</div>
            <div class="text-2xl font-bold">{{ stats.totalCount }}</div>
          </div>
        </NCard>
        <NCard>
          <div class="text-center">
            <div class="text-sm text-gray-500 mb-2">总充值金额</div>
            <div class="text-2xl font-bold text-green-600">
              ¥{{ formatAmount(stats.byType.RECHARGE?.amount || 0) }}
            </div>
          </div>
        </NCard>
        <NCard>
          <div class="text-center">
            <div class="text-sm text-gray-500 mb-2">总消费金额</div>
            <div class="text-2xl font-bold text-red-600">
              ¥{{ formatAmount(Math.abs(stats.byType.CONSUMPTION?.amount || 0)) }}
            </div>
          </div>
        </NCard>
      </div>

      <!-- 筛选器 -->
      <NCard class="mb-6">
        <NSpace vertical>
          <NSpace>
            <NSelect
              v-model:value="filter.type"
              :options="typeOptions"
              placeholder="交易类型"
              style="width: 200px"
              clearable
              @update:value="loadTransactions"
            />
            <NDatePicker
              v-model:value="filter.dateRange"
              type="daterange"
              clearable
              @update:value="loadTransactions"
            />
            <NButton type="primary" @click="loadTransactions">查询</NButton>
            <NButton @click="handleReset">重置</NButton>
          </NSpace>
        </NSpace>
      </NCard>

      <!-- 交易列表 -->
      <NCard>
        <NDataTable
          :columns="columns"
          :data="transactions"
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
  NTag,
  type DataTableColumns,
  type PaginationProps,
  useMessage,
} from 'naive-ui'
import { h } from 'vue'

definePageMeta({
  middleware: 'auth',
})

const message = useMessage()
const { get } = useApi()

// 状态
const transactions = ref<any[]>([])
const stats = ref<any>({
  totalCount: 0,
  totalAmount: 0,
  byType: {},
})
const loading = ref(false)
const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0,
})

// 筛选器
const filter = reactive({
  type: null as string | null,
  dateRange: null as [number, number] | null,
})

// 交易类型选项
const typeOptions = [
  { label: '充值', value: 'RECHARGE' },
  { label: '消费', value: 'CONSUMPTION' },
  { label: '退款', value: 'REFUND' },
  { label: '注册赠送', value: 'GIFT_REGISTER' },
  { label: '签到赠送', value: 'GIFT_SIGNIN' },
  { label: '推荐赠送', value: 'GIFT_REFERRAL' },
  { label: '管理员调整', value: 'ADJUSTMENT' },
]

// 表格列
const columns: DataTableColumns<any> = [
  {
    title: '交易类型',
    key: 'type',
    width: 120,
    render(row) {
      const typeMap: Record<string, { label: string; type: any }> = {
        RECHARGE: { label: '充值', type: 'success' },
        CONSUMPTION: { label: '消费', type: 'error' },
        REFUND: { label: '退款', type: 'warning' },
        GIFT_REGISTER: { label: '注册赠送', type: 'info' },
        GIFT_SIGNIN: { label: '签到赠送', type: 'info' },
        GIFT_REFERRAL: { label: '推荐赠送', type: 'info' },
        ADJUSTMENT: { label: '管理员调整', type: 'default' },
      }
      const config = typeMap[row.type] || { label: row.type, type: 'default' }
      return h(NTag, { type: config.type }, { default: () => config.label })
    },
  },
  {
    title: '金额',
    key: 'amount',
    width: 120,
    render(row) {
      const amount = Number(row.amount)
      const color = amount >= 0 ? 'text-green-600' : 'text-red-600'
      return h('span', { class: `font-bold ${color}` }, `¥${formatAmount(amount)}`)
    },
  },
  {
    title: '变动前余额',
    key: 'balanceBefore',
    width: 120,
    render(row) {
      return `¥${formatAmount(row.balanceBefore)}`
    },
  },
  {
    title: '变动后余额',
    key: 'balanceAfter',
    width: 120,
    render(row) {
      return `¥${formatAmount(row.balanceAfter)}`
    },
  },
  {
    title: '描述',
    key: 'description',
    ellipsis: {
      tooltip: true,
    },
  },
  {
    title: '支付方式',
    key: 'paymentMethod',
    width: 100,
    render(row) {
      if (!row.paymentMethod) return '-'
      const methodMap: Record<string, string> = {
        alipay: '支付宝',
        wechat: '微信支付',
      }
      return methodMap[row.paymentMethod] || row.paymentMethod
    },
  },
  {
    title: '交易时间',
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
  return Math.abs(num).toFixed(2)
}

// 加载交易记录
async function loadTransactions() {
  loading.value = true
  try {
    const query: any = {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
    }

    if (filter.type) {
      query.type = filter.type
    }

    if (filter.dateRange) {
      query.startDate = new Date(filter.dateRange[0]).toISOString()
      query.endDate = new Date(filter.dateRange[1]).toISOString()
    }

    const response = await get('/api/user/transactions', query)
    if (response.success) {
      transactions.value = response.data.transactions
      pagination.value.total = response.data.pagination.total
      stats.value = response.data.stats
    } else {
      message.error(response.message || '加载失败')
    }
  } catch (error) {
    console.error('Load transactions failed:', error)
    message.error('加载失败')
  } finally {
    loading.value = false
  }
}

// 页码变化
function handlePageChange(page: number) {
  pagination.value.page = page
  loadTransactions()
}

// 每页数量变化
function handlePageSizeChange(pageSize: number) {
  pagination.value.pageSize = pageSize
  pagination.value.page = 1
  loadTransactions()
}

// 重置筛选
function handleReset() {
  filter.type = null
  filter.dateRange = null
  pagination.value.page = 1
  loadTransactions()
}

// 初始化
onMounted(() => {
  loadTransactions()
})
</script>
