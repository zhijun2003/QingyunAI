<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold">Provider 管理</h2>
      <NButton type="primary" @click="showAddModal = true">
        添加 Provider
      </NButton>
    </div>

    <!-- Provider 列表 -->
    <NCard>
      <NDataTable
        :columns="columns"
        :data="providers"
        :loading="loading"
        :pagination="pagination"
      />
    </NCard>

    <!-- 添加/编辑 Provider 弹窗 -->
    <NModal
      v-model:show="showAddModal"
      preset="card"
      :title="editingProvider ? '编辑 Provider' : '添加 Provider'"
      style="width: 600px"
    >
      <NForm
        ref="formRef"
        :model="providerForm"
        :rules="formRules"
        label-placement="top"
      >
        <NFormItem label="名称（唯一标识）" path="name">
          <NInput
            v-model:value="providerForm.name"
            placeholder="例如：openai-official"
            :disabled="!!editingProvider"
          />
        </NFormItem>

        <NFormItem label="显示名称" path="displayName">
          <NInput
            v-model:value="providerForm.displayName"
            placeholder="例如：OpenAI 官方"
          />
        </NFormItem>

        <NFormItem label="类型" path="type">
          <NSelect
            v-model:value="providerForm.type"
            :options="providerTypes"
          />
        </NFormItem>

        <NFormItem label="Base URL" path="baseUrl">
          <NInput
            v-model:value="providerForm.baseUrl"
            placeholder="例如：https://api.openai.com"
          />
        </NFormItem>

        <NFormItem label="描述" path="description">
          <NInput
            v-model:value="providerForm.description"
            type="textarea"
            placeholder="可选描述"
          />
        </NFormItem>

        <NFormItem label="自动同步">
          <NSwitch v-model:value="providerForm.autoSync" />
          <span class="ml-2 text-sm text-gray-500">启用后将定期自动同步模型</span>
        </NFormItem>

        <NFormItem v-if="providerForm.autoSync" label="同步间隔（秒）" path="syncInterval">
          <NInputNumber
            v-model:value="providerForm.syncInterval"
            :min="60"
            :max="86400"
            placeholder="3600"
          />
        </NFormItem>

        <NFormItem label="状态">
          <NSwitch v-model:value="providerForm.isActive" />
          <span class="ml-2 text-sm text-gray-500">是否启用该 Provider</span>
        </NFormItem>

        <!-- API 密钥列表（仅在添加时） -->
        <div v-if="!editingProvider">
          <NDivider />
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-semibold">API 密钥</h3>
            <NButton size="small" @click="addApiKey">
              添加密钥
            </NButton>
          </div>

          <div v-for="(key, index) in providerForm.apiKeys" :key="index" class="mb-4 p-4 border rounded">
            <div class="flex justify-between items-center mb-2">
              <span class="font-medium">密钥 {{ index + 1 }}</span>
              <NButton
                size="tiny"
                type="error"
                text
                @click="removeApiKey(index)"
              >
                删除
              </NButton>
            </div>

            <NFormItem label="密钥名称">
              <NInput
                v-model:value="key.name"
                placeholder="例如：主密钥"
              />
            </NFormItem>

            <NFormItem label="API Key">
              <NInput
                v-model:value="key.apiKey"
                type="password"
                show-password-on="click"
                placeholder="请输入 API Key"
              />
            </NFormItem>

            <div class="grid grid-cols-2 gap-4">
              <NFormItem label="权重">
                <NInputNumber
                  v-model:value="key.weight"
                  :min="1"
                  :max="100"
                />
              </NFormItem>

              <NFormItem label="优先级">
                <NInputNumber
                  v-model:value="key.priority"
                  :min="0"
                  :max="100"
                />
              </NFormItem>
            </div>
          </div>

          <NAlert v-if="providerForm.apiKeys.length === 0" type="warning">
            请至少添加一个 API 密钥
          </NAlert>
        </div>
      </NForm>

      <template #footer>
        <div class="flex justify-end space-x-2">
          <NButton @click="showAddModal = false">取消</NButton>
          <NButton
            type="primary"
            :loading="saving"
            @click="handleSaveProvider"
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
  NDivider,
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
  type FormRules,
  useDialog,
  useMessage,
} from 'naive-ui'
import { h } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const message = useMessage()
const dialog = useDialog()
const { get, post, put, delete: del } = useApi()

// 状态
const loading = ref(false)
const saving = ref(false)
const providers = ref<any[]>([])
const showAddModal = ref(false)
const editingProvider = ref<any>(null)
const formRef = ref<FormInst | null>(null)

// Provider 表单
const providerForm = reactive({
  name: '',
  displayName: '',
  type: 'OPENAI',
  baseUrl: '',
  description: '',
  autoSync: false,
  syncInterval: 3600,
  isActive: true,
  apiKeys: [] as any[],
})

// Provider 类型选项
const providerTypes = [
  { label: 'OpenAI', value: 'OPENAI' },
  { label: 'Anthropic (Claude)', value: 'ANTHROPIC' },
  { label: 'Google (Gemini)', value: 'GOOGLE' },
  { label: 'DeepSeek', value: 'DEEPSEEK' },
  { label: 'Moonshot (Kimi)', value: 'MOONSHOT' },
  { label: '其他', value: 'OTHER' },
]

// 表单验证规则
const formRules: FormRules = {
  name: [
    { required: true, message: '请输入名称', trigger: 'blur' },
    {
      pattern: /^[a-z0-9-]+$/,
      message: '只能包含小写字母、数字和连字符',
      trigger: 'blur',
    },
  ],
  displayName: [
    { required: true, message: '请输入显示名称', trigger: 'blur' },
  ],
  type: [
    { required: true, message: '请选择类型', trigger: 'change' },
  ],
  baseUrl: [
    { required: true, message: '请输入 Base URL', trigger: 'blur' },
    {
      pattern: /^https?:\/\/.+/,
      message: '请输入有效的 URL',
      trigger: 'blur',
    },
  ],
}

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 10,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
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
    title: '名称',
    key: 'name',
    width: 150,
  },
  {
    title: '显示名称',
    key: 'displayName',
    width: 150,
  },
  {
    title: '类型',
    key: 'type',
    width: 120,
    render: (row: any) => {
      const typeMap: Record<string, string> = {
        OPENAI: 'OpenAI',
        ANTHROPIC: 'Claude',
        GOOGLE: 'Gemini',
        DEEPSEEK: 'DeepSeek',
        MOONSHOT: 'Kimi',
        OTHER: '其他',
      }
      return typeMap[row.type] || row.type
    },
  },
  {
    title: 'Base URL',
    key: 'baseUrl',
    ellipsis: { tooltip: true },
  },
  {
    title: '密钥数',
    key: '_count',
    width: 80,
    render: (row: any) => row._count?.apiKeys || 0,
  },
  {
    title: '模型数',
    key: '_count',
    width: 80,
    render: (row: any) => row._count?.models || 0,
  },
  {
    title: '状态',
    key: 'isActive',
    width: 80,
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
    width: 280,
    render: (row: any) => {
      return h('div', { class: 'flex space-x-2' }, [
        h(
          NButton,
          {
            size: 'small',
            onClick: () => handleViewKeys(row),
          },
          { default: () => '密钥管理' }
        ),
        h(
          NButton,
          {
            size: 'small',
            onClick: () => handleTestConnection(row),
          },
          { default: () => '测试连接' }
        ),
        h(
          NButton,
          {
            size: 'small',
            type: 'primary',
            onClick: () => handleSyncModels(row),
          },
          { default: () => '同步模型' }
        ),
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
            type: 'error',
            onClick: () => handleDelete(row),
          },
          { default: () => '删除' }
        ),
      ])
    },
  },
]

// 加载 Provider 列表
async function loadProviders() {
  loading.value = true
  try {
    const response = await get('/api/admin/providers')
    if (response.success) {
      providers.value = response.data || []
    }
  } finally {
    loading.value = false
  }
}

// 添加 API 密钥
function addApiKey() {
  providerForm.apiKeys.push({
    name: '',
    apiKey: '',
    weight: 1,
    priority: 0,
  })
}

// 删除 API 密钥
function removeApiKey(index: number) {
  providerForm.apiKeys.splice(index, 1)
}

// 保存 Provider
async function handleSaveProvider() {
  try {
    await formRef.value?.validate()

    if (!editingProvider.value && providerForm.apiKeys.length === 0) {
      message.error('请至少添加一个 API 密钥')
      return
    }

    saving.value = true

    const data = { ...providerForm }
    if (editingProvider.value) {
      delete data.apiKeys
    }

    const response = editingProvider.value
      ? await put(`/api/admin/providers/${editingProvider.value.id}`, data)
      : await post('/api/admin/providers', data)

    if (response.success) {
      message.success(editingProvider.value ? '更新成功' : '创建成功')
      showAddModal.value = false
      await loadProviders()
      resetForm()
    } else {
      message.error(response.message || '操作失败')
    }
  } catch (error) {
    console.error('Save provider failed:', error)
  } finally {
    saving.value = false
  }
}

// 编辑
function handleEdit(row: any) {
  editingProvider.value = row
  Object.assign(providerForm, {
    name: row.name,
    displayName: row.displayName,
    type: row.type,
    baseUrl: row.baseUrl,
    description: row.description || '',
    autoSync: row.autoSync,
    syncInterval: row.syncInterval || 3600,
    isActive: row.isActive,
    apiKeys: [],
  })
  showAddModal.value = true
}

// 删除
function handleDelete(row: any) {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除 Provider "${row.displayName}" 吗？这将同时删除其下的所有模型和 API 密钥。`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      const response = await del(`/api/admin/providers/${row.id}`)
      if (response.success) {
        message.success('删除成功')
        await loadProviders()
      } else {
        message.error(response.message || '删除失败')
      }
    },
  })
}

// 查看密钥
function handleViewKeys(row: any) {
  // 导航到密钥管理页面
  navigateTo(`/admin/providers/${row.id}/keys`)
}

// 测试连接
async function handleTestConnection(row: any) {
  const response = await post(`/api/admin/providers/${row.id}/test`, {})
  if (response.success) {
    message.success('连接测试成功')
  } else {
    message.error(response.message || '连接测试失败')
  }
}

// 同步模型
async function handleSyncModels(row: any) {
  const response = await post(`/api/admin/providers/${row.id}/sync`, {})
  if (response.success) {
    message.success(
      `同步完成：新增 ${response.data?.created || 0} 个，更新 ${response.data?.updated || 0} 个`
    )
    await loadProviders()
  } else {
    message.error(response.message || '同步失败')
  }
}

// 重置表单
function resetForm() {
  editingProvider.value = null
  Object.assign(providerForm, {
    name: '',
    displayName: '',
    type: 'OPENAI',
    baseUrl: '',
    description: '',
    autoSync: false,
    syncInterval: 3600,
    isActive: true,
    apiKeys: [],
  })
}

// 监听弹窗关闭
watch(showAddModal, (val) => {
  if (!val) {
    resetForm()
  }
})

// 初始化
onMounted(() => {
  loadProviders()
})
</script>
