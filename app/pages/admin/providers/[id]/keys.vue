<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <div>
        <NButton text type="primary" @click="router.back()" class="mb-2">
          ← 返回
        </NButton>
        <h2 class="text-2xl font-bold">API 密钥管理 - {{ providerName }}</h2>
      </div>
      <NButton type="primary" @click="showAddModal = true">
        添加密钥
      </NButton>
    </div>

    <!-- 密钥列表 -->
    <NCard>
      <NDataTable
        :columns="columns"
        :data="apiKeys"
        :loading="loading"
      />
    </NCard>

    <!-- 添加/编辑密钥弹窗 -->
    <NModal
      v-model:show="showAddModal"
      preset="card"
      :title="editingKey ? '编辑密钥' : '添加密钥'"
      style="width: 600px"
    >
      <NForm
        ref="formRef"
        :model="keyForm"
        :rules="formRules"
        label-placement="top"
      >
        <NFormItem label="密钥名称" path="name">
          <NInput
            v-model:value="keyForm.name"
            placeholder="例如：主密钥"
          />
        </NFormItem>

        <NFormItem label="API Key" path="apiKey">
          <NInput
            v-model:value="keyForm.apiKey"
            type="password"
            show-password-on="click"
            placeholder="请输入 API Key"
          />
        </NFormItem>

        <div class="grid grid-cols-2 gap-4">
          <NFormItem label="权重" path="weight">
            <NInputNumber
              v-model:value="keyForm.weight"
              :min="1"
              :max="100"
              placeholder="1"
            />
            <span class="text-xs text-gray-500 mt-1">权重越大，被选中概率越高</span>
          </NFormItem>

          <NFormItem label="优先级" path="priority">
            <NInputNumber
              v-model:value="keyForm.priority"
              :min="0"
              :max="100"
              placeholder="0"
            />
            <span class="text-xs text-gray-500 mt-1">数值越小，优先级越高</span>
          </NFormItem>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <NFormItem label="每日限额">
            <NInputNumber
              v-model:value="keyForm.dailyLimit"
              :min="0"
              placeholder="无限制"
            />
          </NFormItem>

          <NFormItem label="每月限额">
            <NInputNumber
              v-model:value="keyForm.monthlyLimit"
              :min="0"
              placeholder="无限制"
            />
          </NFormItem>
        </div>

        <NFormItem label="状态">
          <NSwitch v-model:value="keyForm.isActive" />
          <span class="ml-2 text-sm text-gray-500">是否启用该密钥</span>
        </NFormItem>
      </NForm>

      <template #footer>
        <div class="flex justify-end space-x-2">
          <NButton @click="showAddModal = false">取消</NButton>
          <NButton
            type="primary"
            :loading="saving"
            @click="handleSaveKey"
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
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NProgress,
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

const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const { get, post, put, delete: del } = useApi()

const providerId = route.params.id as string

// 状态
const loading = ref(false)
const saving = ref(false)
const apiKeys = ref<any[]>([])
const providerName = ref('')
const showAddModal = ref(false)
const editingKey = ref<any>(null)
const formRef = ref<FormInst | null>(null)

// 密钥表单
const keyForm = reactive({
  name: '',
  apiKey: '',
  weight: 1,
  priority: 0,
  dailyLimit: null as number | null,
  monthlyLimit: null as number | null,
  isActive: true,
})

// 表单验证规则
const formRules: FormRules = {
  name: [
    { required: true, message: '请输入密钥名称', trigger: 'blur' },
  ],
  apiKey: [
    { required: true, message: '请输入 API Key', trigger: 'blur' },
  ],
  weight: [
    { required: true, type: 'number', message: '请输入权重', trigger: 'blur' },
  ],
  priority: [
    { required: true, type: 'number', message: '请输入优先级', trigger: 'blur' },
  ],
}

// 表格列定义
const columns: DataTableColumns = [
  {
    title: '名称',
    key: 'name',
    width: 120,
  },
  {
    title: 'API Key',
    key: 'keyEncrypted',
    width: 150,
    render: () => '••••••••••••',
  },
  {
    title: '权重/优先级',
    key: 'weight',
    width: 120,
    render: (row: any) => `${row.weight} / ${row.priority}`,
  },
  {
    title: '每日使用',
    key: 'dailyUsed',
    width: 150,
    render: (row: any) => {
      if (!row.dailyLimit) return `${row.dailyUsed} / 无限制`
      const percent = (row.dailyUsed / row.dailyLimit) * 100
      return h('div', [
        h('div', `${row.dailyUsed} / ${row.dailyLimit}`),
        h(NProgress, {
          type: 'line',
          percentage: percent,
          status: percent >= 90 ? 'error' : percent >= 70 ? 'warning' : 'success',
          showIndicator: false,
        }),
      ])
    },
  },
  {
    title: '每月使用',
    key: 'monthlyUsed',
    width: 150,
    render: (row: any) => {
      if (!row.monthlyLimit) return `${row.monthlyUsed} / 无限制`
      const percent = (row.monthlyUsed / row.monthlyLimit) * 100
      return h('div', [
        h('div', `${row.monthlyUsed} / ${row.monthlyLimit}`),
        h(NProgress, {
          type: 'line',
          percentage: percent,
          status: percent >= 90 ? 'error' : percent >= 70 ? 'warning' : 'success',
          showIndicator: false,
        }),
      ])
    },
  },
  {
    title: '错误次数',
    key: 'errorCount',
    width: 90,
    render: (row: any) => {
      return h(
        NTag,
        {
          type: row.errorCount >= 5 ? 'error' : row.errorCount > 0 ? 'warning' : 'default',
          size: 'small',
        },
        { default: () => row.errorCount }
      )
    },
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
    width: 200,
    render: (row: any) => {
      return h('div', { class: 'flex flex-col space-y-1' }, [
        h('div', { class: 'flex space-x-2' }, [
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
        ]),
        h('div', { class: 'flex space-x-2' }, [
          h(
            NButton,
            {
              size: 'tiny',
              onClick: () => handleResetUsage(row, 'daily'),
            },
            { default: () => '重置日用量' }
          ),
          h(
            NButton,
            {
              size: 'tiny',
              onClick: () => handleResetUsage(row, 'monthly'),
            },
            { default: () => '重置月用量' }
          ),
        ]),
      ])
    },
  },
]

// 加载密钥列表
async function loadApiKeys() {
  loading.value = true
  try {
    const response = await get(`/api/admin/providers/${providerId}/keys`)
    if (response.success) {
      apiKeys.value = response.data?.keys || []
      providerName.value = response.data?.provider?.displayName || ''
    }
  } finally {
    loading.value = false
  }
}

// 保存密钥
async function handleSaveKey() {
  try {
    await formRef.value?.validate()
    saving.value = true

    const data = { ...keyForm }

    const response = editingKey.value
      ? await put(`/api/admin/providers/${providerId}/keys/${editingKey.value.id}`, data)
      : await post(`/api/admin/providers/${providerId}/keys`, data)

    if (response.success) {
      message.success(editingKey.value ? '更新成功' : '添加成功')
      showAddModal.value = false
      await loadApiKeys()
      resetForm()
    } else {
      message.error(response.message || '操作失败')
    }
  } catch (error) {
    console.error('Save key failed:', error)
  } finally {
    saving.value = false
  }
}

// 编辑
function handleEdit(row: any) {
  editingKey.value = row
  Object.assign(keyForm, {
    name: row.name,
    apiKey: '', // 不显示原密钥
    weight: row.weight,
    priority: row.priority,
    dailyLimit: row.dailyLimit,
    monthlyLimit: row.monthlyLimit,
    isActive: row.isActive,
  })
  showAddModal.value = true
}

// 删除
function handleDelete(row: any) {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除密钥 "${row.name}" 吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      const response = await del(`/api/admin/providers/${providerId}/keys/${row.id}`)
      if (response.success) {
        message.success('删除成功')
        await loadApiKeys()
      } else {
        message.error(response.message || '删除失败')
      }
    },
  })
}

// 重置用量
async function handleResetUsage(row: any, type: string) {
  const response = await post(`/api/admin/providers/${providerId}/keys/${row.id}/reset`, {
    resetType: type,
  })
  if (response.success) {
    message.success('重置成功')
    await loadApiKeys()
  } else {
    message.error(response.message || '重置失败')
  }
}

// 重置表单
function resetForm() {
  editingKey.value = null
  Object.assign(keyForm, {
    name: '',
    apiKey: '',
    weight: 1,
    priority: 0,
    dailyLimit: null,
    monthlyLimit: null,
    isActive: true,
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
  loadApiKeys()
})
</script>
