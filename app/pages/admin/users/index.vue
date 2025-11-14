<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold">用户管理</h2>
    </div>

    <!-- 筛选器 -->
    <NCard class="mb-4">
      <div class="grid grid-cols-4 gap-4">
        <NSelect
          v-model:value="filters.role"
          placeholder="角色"
          :options="roleOptions"
          clearable
          @update:value="loadUsers"
        />
        <NSelect
          v-model:value="filters.status"
          placeholder="状态"
          :options="statusOptions"
          clearable
          @update:value="loadUsers"
        />
        <NInput
          v-model:value="filters.search"
          placeholder="搜索用户名/邮箱/手机号"
          clearable
          @update:value="loadUsers"
        />
      </div>
    </NCard>

    <!-- 用户列表 -->
    <NCard>
      <NDataTable
        :columns="columns"
        :data="users"
        :loading="loading"
        :pagination="pagination"
      />
    </NCard>

    <!-- 编辑用户弹窗 -->
    <NModal
      v-model:show="showEditModal"
      preset="card"
      title="编辑用户"
      style="width: 600px"
    >
      <NForm
        ref="formRef"
        :model="userForm"
        label-placement="top"
      >
        <NFormItem label="用户名">
          <NInput v-model:value="userForm.username" disabled />
        </NFormItem>

        <NFormItem label="昵称">
          <NInput v-model:value="userForm.nickname" />
        </NFormItem>

        <NFormItem label="邮箱">
          <NInput v-model:value="userForm.email" disabled />
        </NFormItem>

        <NFormItem label="手机号">
          <NInput v-model:value="userForm.phone" disabled />
        </NFormItem>

        <NFormItem label="角色">
          <NSelect
            v-model:value="userForm.role"
            :options="[
              { label: '普通用户', value: 'USER' },
              { label: '管理员', value: 'ADMIN' },
            ]"
          />
        </NFormItem>

        <NFormItem label="状态">
          <NSelect
            v-model:value="userForm.status"
            :options="[
              { label: '正常', value: 'ACTIVE' },
              { label: '已暂停', value: 'SUSPENDED' },
              { label: '已封禁', value: 'BANNED' },
            ]"
          />
        </NFormItem>

        <NDivider />

        <div class="grid grid-cols-2 gap-4">
          <NFormItem label="账户余额（分）">
            <NInputNumber
              v-model:value="userForm.balance"
              :min="0"
              :step="100"
            />
            <span class="text-xs text-gray-500 mt-1">1元 = 100分</span>
          </NFormItem>

          <NFormItem label="免费额度（分）">
            <NInputNumber
              v-model:value="userForm.freeQuota"
              :min="0"
              :step="100"
            />
          </NFormItem>
        </div>

        <NAlert type="info">
          当前余额: ¥{{ (userForm.balance / 100).toFixed(2) }}，免费额度: ¥{{ (userForm.freeQuota / 100).toFixed(2) }}
        </NAlert>
      </NForm>

      <template #footer>
        <div class="flex justify-end space-x-2">
          <NButton @click="showEditModal = false">取消</NButton>
          <NButton
            type="primary"
            :loading="saving"
            @click="handleSaveUser"
          >
            保存
          </NButton>
        </div>
      </template>
    </NModal>

    <!-- 调整余额弹窗 -->
    <NModal
      v-model:show="showBalanceModal"
      preset="card"
      title="调整用户余额"
      style="width: 500px"
    >
      <NForm ref="balanceFormRef" :model="balanceForm" label-placement="top">
        <NAlert type="info" class="mb-4">
          <div class="flex items-center justify-between">
            <span>当前余额</span>
            <strong>¥{{ ((editingUser?.balance || 0) / 100).toFixed(2) }}</strong>
          </div>
        </NAlert>

        <NFormItem label="调整金额（元）" required>
          <NInputNumber
            v-model:value="balanceForm.amount"
            :step="1"
            :precision="2"
            placeholder="正数为增加，负数为减少"
            style="width: 100%"
          >
            <template #prefix>¥</template>
          </NInputNumber>
        </NFormItem>

        <NFormItem label="调整原因" required>
          <NInput
            v-model:value="balanceForm.reason"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 5 }"
            placeholder="请输入调整原因，例如：补偿、奖励、扣除违规所得等"
          />
        </NFormItem>

        <NAlert v-if="balanceForm.amount !== 0" type="warning" :bordered="false">
          调整后余额：¥{{ ((editingUser?.balance || 0) + (balanceForm.amount || 0) * 100) / 100).toFixed(2) }}
        </NAlert>
      </NForm>

      <template #footer>
        <div class="flex justify-end space-x-2">
          <NButton @click="showBalanceModal = false">取消</NButton>
          <NButton
            type="primary"
            :loading="adjusting"
            :disabled="!balanceForm.amount || !balanceForm.reason"
            @click="handleAdjustBalance"
          >
            确认调整
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
const adjusting = ref(false)
const users = ref<any[]>([])
const showEditModal = ref(false)
const showBalanceModal = ref(false)
const editingUser = ref<any>(null)
const formRef = ref<FormInst | null>(null)
const balanceFormRef = ref<FormInst | null>(null)

// 筛选器
const filters = reactive({
  role: null,
  status: null,
  search: '',
})

// 用户表单
const userForm = reactive({
  username: '',
  nickname: '',
  email: '',
  phone: '',
  role: 'USER',
  status: 'ACTIVE',
  balance: 0,
  freeQuota: 0,
})

// 余额调整表单
const balanceForm = reactive({
  amount: 0,
  reason: '',
})

// 角色选项
const roleOptions = [
  { label: '全部', value: null },
  { label: '普通用户', value: 'USER' },
  { label: '管理员', value: 'ADMIN' },
]

// 状态选项
const statusOptions = [
  { label: '全部', value: null },
  { label: '正常', value: 'ACTIVE' },
  { label: '已暂停', value: 'SUSPENDED' },
  { label: '已封禁', value: 'BANNED' },
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
    title: '用户名',
    key: 'username',
    width: 120,
  },
  {
    title: '昵称',
    key: 'nickname',
    width: 120,
    render: (row: any) => row.nickname || '-',
  },
  {
    title: '邮箱',
    key: 'email',
    width: 180,
    ellipsis: { tooltip: true },
    render: (row: any) => row.email || '-',
  },
  {
    title: '手机号',
    key: 'phone',
    width: 120,
    render: (row: any) => row.phone || '-',
  },
  {
    title: '角色',
    key: 'role',
    width: 80,
    render: (row: any) => {
      return h(
        NTag,
        { type: row.role === 'ADMIN' ? 'success' : 'default', size: 'small' },
        { default: () => (row.role === 'ADMIN' ? '管理员' : '用户') }
      )
    },
  },
  {
    title: '状态',
    key: 'status',
    width: 80,
    render: (row: any) => {
      const statusMap: Record<string, { label: string; type: any }> = {
        ACTIVE: { label: '正常', type: 'success' },
        SUSPENDED: { label: '暂停', type: 'warning' },
        BANNED: { label: '封禁', type: 'error' },
      }
      const info = statusMap[row.status] || { label: row.status, type: 'default' }
      return h(NTag, { type: info.type, size: 'small' }, { default: () => info.label })
    },
  },
  {
    title: '余额',
    key: 'balance',
    width: 100,
    render: (row: any) => `¥${(row.balance / 100).toFixed(2)}`,
  },
  {
    title: '免费额度',
    key: 'freeQuota',
    width: 100,
    render: (row: any) => `¥${(row.freeQuota / 100).toFixed(2)}`,
  },
  {
    title: '注册时间',
    key: 'createdAt',
    width: 160,
    render: (row: any) => new Date(row.createdAt).toLocaleString('zh-CN'),
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
            onClick: () => handleOpenBalanceModal(row),
          },
          { default: () => '调整余额' }
        ),
      ])
    },
  },
]

// 加载用户列表
async function loadUsers() {
  loading.value = true
  try {
    const params: any = {}
    if (filters.role) params.role = filters.role
    if (filters.status) params.status = filters.status
    if (filters.search) params.search = filters.search

    const response = await get('/api/admin/users', params)
    if (response.success) {
      users.value = response.data || []
    }
  } finally {
    loading.value = false
  }
}

// 编辑用户
function handleEdit(row: any) {
  editingUser.value = row
  Object.assign(userForm, {
    username: row.username,
    nickname: row.nickname || '',
    email: row.email || '',
    phone: row.phone || '',
    role: row.role,
    status: row.status,
    balance: row.balance,
    freeQuota: row.freeQuota,
  })
  showEditModal.value = true
}

// 保存用户
async function handleSaveUser() {
  saving.value = true
  try {
    const response = await put(`/api/admin/users/${editingUser.value.id}`, {
      nickname: userForm.nickname,
      role: userForm.role,
      status: userForm.status,
      balance: userForm.balance,
      freeQuota: userForm.freeQuota,
    })

    if (response.success) {
      message.success('更新成功')
      showEditModal.value = false
      await loadUsers()
    } else {
      message.error(response.message || '更新失败')
    }
  } finally {
    saving.value = false
  }
}

// 打开余额调整弹窗
function handleOpenBalanceModal(row: any) {
  editingUser.value = row
  balanceForm.amount = 0
  balanceForm.reason = ''
  showBalanceModal.value = true
}

// 调整用户余额
async function handleAdjustBalance() {
  if (!balanceForm.amount || !balanceForm.reason) {
    message.warning('请输入调整金额和原因')
    return
  }

  adjusting.value = true
  try {
    // 将金额转换为分
    const amountInCents = Math.round(balanceForm.amount * 100)

    const response = await post(`/api/admin/users/${editingUser.value.id}/balance/adjust`, {
      amount: amountInCents,
      reason: balanceForm.reason,
    })

    if (response.success) {
      message.success(response.message || '余额调整成功')
      showBalanceModal.value = false
      await loadUsers()
    } else {
      message.error(response.message || '余额调整失败')
    }
  } catch (error) {
    console.error('Adjust balance error:', error)
    message.error('余额调整失败')
  } finally {
    adjusting.value = false
  }
}

// 初始化
onMounted(() => {
  loadUsers()
})
</script>
