<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold">模型管理</h2>
      <NButton type="primary" @click="handleSyncAll">
        批量同步所有提供商
      </NButton>
    </div>

    <!-- 筛选器 -->
    <NCard class="mb-4">
      <div class="grid grid-cols-4 gap-4">
        <NSelect
          v-model:value="filters.providerId"
          placeholder="Provider"
          :options="providerOptions"
          clearable
          @update:value="loadModels"
        />
        <NSelect
          v-model:value="filters.category"
          placeholder="类别"
          :options="categoryOptions"
          clearable
          @update:value="loadModels"
        />
        <NSelect
          v-model:value="filters.isActive"
          placeholder="状态"
          :options="statusOptions"
          clearable
          @update:value="loadModels"
        />
        <NInput
          v-model:value="filters.search"
          placeholder="搜索模型名称"
          clearable
          @update:value="loadModels"
        />
      </div>
    </NCard>

    <!-- 模型列表 -->
    <NCard>
      <NDataTable
        :columns="columns"
        :data="models"
        :loading="loading"
        :pagination="pagination"
      />
    </NCard>

    <!-- 编辑价格弹窗 -->
    <NModal
      v-model:show="showPricingModal"
      preset="card"
      title="编辑价格"
      style="width: 600px"
    >
      <NForm
        ref="pricingFormRef"
        :model="pricingForm"
        label-placement="top"
      >
        <NFormItem label="价格来源">
          <NSelect
            v-model:value="pricingForm.priceSource"
            :options="priceSourceOptions"
          />
        </NFormItem>

        <div v-if="pricingForm.priceSource === 'MANUAL'">
          <NFormItem label="输入价格（¥/1K tokens）">
            <NInputNumber
              v-model:value="pricingForm.inputPrice"
              :min="0"
              :step="0.001"
              placeholder="0.000"
            />
          </NFormItem>

          <NFormItem label="输出价格（¥/1K tokens）">
            <NInputNumber
              v-model:value="pricingForm.outputPrice"
              :min="0"
              :step="0.001"
              placeholder="0.000"
            />
          </NFormItem>
        </div>

        <div v-if="pricingForm.priceSource === 'UPSTREAM'">
          <NFormItem label="加价率（%）">
            <NInputNumber
              v-model:value="pricingForm.markupRate"
              :min="0"
              :max="1000"
              placeholder="20"
            />
            <span class="text-xs text-gray-500 mt-1">基于上游价格的加价百分比</span>
          </NFormItem>

          <div v-if="editingModel" class="mt-4 p-4 bg-gray-50 rounded">
            <div class="text-sm space-y-2">
              <div>上游输入价格: ¥{{ formatPrice(editingModel.upstreamInputPrice) }}/1K</div>
              <div>上游输出价格: ¥{{ formatPrice(editingModel.upstreamOutputPrice) }}/1K</div>
              <div class="font-semibold mt-2">
                预计输入价格: ¥{{ calculateUpstreamPrice(editingModel.upstreamInputPrice) }}/1K
              </div>
              <div class="font-semibold">
                预计输出价格: ¥{{ calculateUpstreamPrice(editingModel.upstreamOutputPrice) }}/1K
              </div>
            </div>
          </div>
        </div>

        <NAlert v-if="pricingForm.priceSource === 'AUTO'" type="info" class="mt-4">
          自动模式下，价格将由同步服务自动更新
        </NAlert>
      </NForm>

      <template #footer>
        <div class="flex justify-end space-x-2">
          <NButton @click="showPricingModal = false">取消</NButton>
          <NButton
            type="primary"
            :loading="saving"
            @click="handleSavePricing"
          >
            保存
          </NButton>
        </div>
      </template>
    </NModal>

    <!-- 编辑模型弹窗 -->
    <NModal
      v-model:show="showEditModal"
      preset="card"
      title="编辑模型"
      style="width: 600px"
    >
      <NForm
        ref="editFormRef"
        :model="editForm"
        label-placement="top"
      >
        <NFormItem label="显示名称">
          <NInput v-model:value="editForm.displayName" />
        </NFormItem>

        <NFormItem label="分组名称">
          <NInput v-model:value="editForm.groupName" placeholder="例如：对话模型" />
        </NFormItem>

        <NFormItem label="描述">
          <NInput v-model:value="editForm.description" type="textarea" />
        </NFormItem>

        <NFormItem label="状态">
          <NSwitch v-model:value="editForm.isActive" />
          <span class="ml-2 text-sm text-gray-500">是否启用该模型</span>
        </NFormItem>
      </NForm>

      <template #footer>
        <div class="flex justify-end space-x-2">
          <NButton @click="showEditModal = false">取消</NButton>
          <NButton
            type="primary"
            :loading="saving"
            @click="handleSaveEdit"
          >
            保存
          </NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>

<script setup lang="ts">
import {
  NAlert,
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NSelect,
  NSwitch,
  NTag,
  type DataTableColumns,
  type FormInst,
  useMessage,
} from 'naive-ui'
import { h } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const message = useMessage()
const { get, put, post } = useApi()

// 状态
const loading = ref(false)
const saving = ref(false)
const models = ref<any[]>([])
const providers = ref<any[]>([])
const showPricingModal = ref(false)
const showEditModal = ref(false)
const editingModel = ref<any>(null)
const pricingFormRef = ref<FormInst | null>(null)
const editFormRef = ref<FormInst | null>(null)

// 筛选器
const filters = reactive({
  providerId: null,
  category: null,
  isActive: null,
  search: '',
})

// 价格表单
const pricingForm = reactive({
  priceSource: 'AUTO',
  inputPrice: 0,
  outputPrice: 0,
  markupRate: 20,
})

// 编辑表单
const editForm = reactive({
  displayName: '',
  groupName: '',
  description: '',
  isActive: true,
})

// Provider 选项
const providerOptions = computed(() => [
  { label: '全部', value: null },
  ...providers.value.map((p: any) => ({
    label: p.displayName,
    value: p.id,
  })),
])

// 类别选项
const categoryOptions = [
  { label: '全部', value: null },
  { label: '对话', value: 'CHAT' },
  { label: '图像', value: 'IMAGE' },
  { label: '音频', value: 'AUDIO' },
  { label: '视频', value: 'VIDEO' },
  { label: '嵌入', value: 'EMBEDDING' },
]

// 状态选项
const statusOptions = [
  { label: '全部', value: null },
  { label: '启用', value: true },
  { label: '禁用', value: false },
]

// 价格来源选项
const priceSourceOptions = [
  { label: '自动同步', value: 'AUTO' },
  { label: '手动设置', value: 'MANUAL' },
  { label: '上游加价', value: 'UPSTREAM' },
]

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  onChange: (page: number) => {
    pagination.page = page
  },
  onUpdatePageSize: (pageSize: number) => {
    pagination.pageSize = pageSize
    pagination.page = 1
  },
})

// 表格列定义
const columns: DataTableColumns = [
  {
    title: '模型名称',
    key: 'modelName',
    width: 180,
    ellipsis: { tooltip: true },
  },
  {
    title: '显示名称',
    key: 'displayName',
    width: 150,
  },
  {
    title: 'Provider',
    key: 'provider',
    width: 120,
    render: (row: any) => row.provider?.displayName || '-',
  },
  {
    title: '分组',
    key: 'groupName',
    width: 100,
  },
  {
    title: '类别',
    key: 'category',
    width: 80,
    render: (row: any) => {
      const typeMap: Record<string, { label: string; type: any }> = {
        CHAT: { label: '对话', type: 'info' },
        IMAGE: { label: '图像', type: 'success' },
        AUDIO: { label: '音频', type: 'warning' },
        VIDEO: { label: '视频', type: 'error' },
        EMBEDDING: { label: '嵌入', type: 'default' },
      }
      const info = typeMap[row.category] || { label: row.category, type: 'default' }
      return h(NTag, { type: info.type, size: 'small' }, { default: () => info.label })
    },
  },
  {
    title: '输入价格',
    key: 'inputPrice',
    width: 100,
    render: (row: any) => row.inputPrice ? `¥${formatPrice(row.inputPrice)}` : '-',
  },
  {
    title: '输出价格',
    key: 'outputPrice',
    width: 100,
    render: (row: any) => row.outputPrice ? `¥${formatPrice(row.outputPrice)}` : '-',
  },
  {
    title: '价格来源',
    key: 'priceSource',
    width: 90,
    render: (row: any) => {
      const sourceMap: Record<string, { label: string; type: any }> = {
        AUTO: { label: '自动', type: 'success' },
        MANUAL: { label: '手动', type: 'info' },
        UPSTREAM: { label: '加价', type: 'warning' },
      }
      const info = sourceMap[row.priceSource] || { label: row.priceSource, type: 'default' }
      return h(NTag, { type: info.type, size: 'small' }, { default: () => info.label })
    },
  },
  {
    title: '状态',
    key: 'isActive',
    width: 70,
    render: (row: any) => {
      return h(
        NTag,
        { type: row.isActive ? 'success' : 'default', size: 'small' },
        { default: () => (row.isActive ? '启用' : '禁用') }
      )
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    fixed: 'right',
    render: (row: any) => {
      return h('div', { class: 'flex space-x-2' }, [
        h(
          NButton,
          {
            size: 'small',
            onClick: () => handleEdit(row),
          },
          { default: () => '编辑' }
        ),
        h(
          NButton,
          {
            size: 'small',
            type: 'primary',
            onClick: () => handleEditPricing(row),
          },
          { default: () => '价格' }
        ),
      ])
    },
  },
]

// 加载模型列表
async function loadModels() {
  loading.value = true
  try {
    const params: any = {}
    if (filters.providerId) params.providerId = filters.providerId
    if (filters.category) params.category = filters.category
    if (filters.isActive !== null) params.isActive = filters.isActive
    if (filters.search) params.search = filters.search

    const response = await get('/api/admin/models', params)
    if (response.success) {
      models.value = response.data?.models || []
    }
  } finally {
    loading.value = false
  }
}

// 加载 Provider 列表
async function loadProviders() {
  const response = await get('/api/admin/providers')
  if (response.success) {
    providers.value = response.data || []
  }
}

// 编辑模型
function handleEdit(row: any) {
  editingModel.value = row
  Object.assign(editForm, {
    displayName: row.displayName,
    groupName: row.groupName,
    description: row.description || '',
    isActive: row.isActive,
  })
  showEditModal.value = true
}

// 保存编辑
async function handleSaveEdit() {
  saving.value = true
  try {
    const response = await put(`/api/admin/models/${editingModel.value.id}`, editForm)
    if (response.success) {
      message.success('更新成功')
      showEditModal.value = false
      await loadModels()
    } else {
      message.error(response.message || '更新失败')
    }
  } finally {
    saving.value = false
  }
}

// 编辑价格
function handleEditPricing(row: any) {
  editingModel.value = row
  Object.assign(pricingForm, {
    priceSource: row.priceSource,
    inputPrice: row.inputPrice ? Number(row.inputPrice) : 0,
    outputPrice: row.outputPrice ? Number(row.outputPrice) : 0,
    markupRate: row.markupRate || 20,
  })
  showPricingModal.value = true
}

// 保存价格
async function handleSavePricing() {
  saving.value = true
  try {
    const response = await put(`/api/admin/models/${editingModel.value.id}/pricing`, pricingForm)
    if (response.success) {
      message.success('价格更新成功')
      showPricingModal.value = false
      await loadModels()
    } else {
      message.error(response.message || '更新失败')
    }
  } finally {
    saving.value = false
  }
}

// 批量同步所有提供商
async function handleSyncAll() {
  const response = await post('/api/admin/providers/sync-all', {})
  if (response.success) {
    message.success('批量同步完成')
    await loadModels()
  } else {
    message.error(response.message || '同步失败')
  }
}

// 格式化价格
function formatPrice(price: any): string {
  if (!price) return '0.000'
  return Number(price).toFixed(4)
}

// 计算上游加价后的价格
function calculateUpstreamPrice(upstreamPrice: any): string {
  if (!upstreamPrice) return '0.000'
  const price = Number(upstreamPrice) * (1 + pricingForm.markupRate / 100)
  return price.toFixed(4)
}

// 初始化
onMounted(() => {
  loadProviders()
  loadModels()
})
</script>
